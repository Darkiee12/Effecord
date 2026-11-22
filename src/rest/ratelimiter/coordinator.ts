import { Clock, Data, Deferred, Duration, Effect, Fiber, Option, Queue, Ref } from "effect";
import type { RateLimitHeaders } from "./headers";
import { discoveredKey, provisionalKey, routeKey } from "./route";
import type { HttpMethod, Route } from "../types";

export interface Permit {
  readonly id: number;
  readonly method: HttpMethod;
  readonly route: Route;
}

interface Waiter {
  readonly id: number;
  readonly method: HttpMethod;
  readonly route: Route;
  readonly reply: Deferred.Deferred<Permit>;
}

interface Bucket {
  readonly waiting: Array<Waiter>;
  inFlight: number;
  limit: Option.Option<number>;
  remaining: Option.Option<number>;
  resetAt: number;
  blockedUntil: number;
  lastUsedAt: number;
}

interface ActivePermit {
  key: string;
  decremented: boolean;
}

const IDLE_BUCKET_TTL_MILLIS = 5 * 60 * 1_000;

type Command = Data.TaggedEnum<{
  Acquire: {
    readonly waiter: Waiter;
  };
  Observe: {
    readonly permit: Permit;
    readonly headers: RateLimitHeaders;
    readonly status: number;
    readonly reply: Deferred.Deferred<void>;
  };
  Release: {
    readonly id: number;
    readonly reply: Deferred.Deferred<void>;
  };
  Cancel: {
    readonly id: number;
  };
  Wake: {
    readonly key: string;
    readonly deadline: number;
  };
}>;

const Command = Data.taggedEnum<Command>();

/**
 * Scoped rate-limit actor. Its fiber owns all mutable bucket state.
 * HTTP runs in callers' fibers, outside the actor.
 *
 * Initial implementation: at most one request in flight per known bucket.
 */
export const make = Effect.gen(function* () {
  const inbox = yield* Queue.bounded<Command>(1_024);
  const ids = yield* Ref.make(0);

  // Only the actor fiber reads or mutates these values.
  const buckets = new Map<string, Bucket>();
  const aliases = new Map<string, string>();
  const active = new Map<number, ActivePermit>();
  const wakes = new Map<
    string,
    { readonly deadline: number; readonly fiber: Fiber.Fiber<boolean> }
  >();
  const sublimits = new Map<string, number>();
  let globalBlockedUntil = 0;
  const globalAdmissions: Array<number> = [];

  // Shared with callers so scope shutdown wakes waiting acquires and acks.
  let closed = false;
  const pendingAcquires = new Set<Deferred.Deferred<Permit>>();
  const pendingAcks = new Set<Deferred.Deferred<void>>();

  // Current routes have no resource-specific sublimit metadata. An endpoint
  // sharing a sublimit across URLs will need an explicit resource key.
  const sublimitKey = (method: HttpMethod, route: Route): string =>
    JSON.stringify([method, route.path]);

  const getBucket = (key: string): Bucket => {
    let bucket = buckets.get(key);
    if (bucket === undefined) {
      bucket = {
        waiting: [],
        inFlight: 0,
        limit: Option.none(),
        remaining: Option.none(),
        resetAt: 0,
        blockedUntil: 0,
        lastUsedAt: 0,
      };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  const scheduleWake = (key: string, deadline: number, now: number) =>
    Effect.gen(function* () {
      const previous = wakes.get(key);
      if (previous !== undefined && previous.deadline === deadline) return;

      if (previous !== undefined) {
        yield* Fiber.interrupt(previous.fiber).pipe(Effect.forkChild);
      }

      const fiber = yield* Effect.sleep(Duration.millis(Math.max(0, deadline - now))).pipe(
        Effect.andThen(Queue.offer(inbox, Command.Wake({ key, deadline }))),
        Effect.forkChild,
      );
      wakes.set(key, { deadline, fiber });
    });

  const cancelWake = (key: string) =>
    Effect.gen(function* () {
      const previous = wakes.get(key);
      if (previous === undefined) return;
      wakes.delete(key);
      yield* Fiber.interrupt(previous.fiber).pipe(Effect.forkChild);
    });

  const drain = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;

    // Keep quota knowledge through its deadline, then forget idle keys.
    let nextEviction = Number.POSITIVE_INFINITY;
    for (const [key, bucket] of buckets) {
      if (bucket.waiting.length !== 0 || bucket.inFlight !== 0) continue;

      yield* cancelWake(key);
      const expiresAt = Math.max(
        bucket.lastUsedAt + IDLE_BUCKET_TTL_MILLIS,
        bucket.resetAt,
        bucket.blockedUntil,
      );
      if (now >= expiresAt) {
        buckets.delete(key);
      } else {
        nextEviction = Math.min(nextEviction, expiresAt);
      }
    }
    if (Number.isFinite(nextEviction)) {
      yield* scheduleWake("evict", nextEviction, now);
    } else {
      yield* cancelWake("evict");
    }

    while (globalAdmissions[0] !== undefined && globalAdmissions[0] + 1_000 <= now) {
      globalAdmissions.shift();
    }

    const oldestAdmission = globalAdmissions[0];
    const globalDeadline = Math.max(
      globalBlockedUntil,
      globalAdmissions.length === 50 && oldestAdmission !== undefined ? oldestAdmission + 1_000 : 0,
    );
    if (now < globalDeadline) {
      yield* scheduleWake("global", globalDeadline, now);
      return;
    }

    for (const [key, bucket] of buckets) {
      if (bucket.waiting.length === 0 || bucket.inFlight !== 0) continue;

      if (now < bucket.blockedUntil) {
        yield* scheduleWake(key, bucket.blockedUntil, now);
        continue;
      }

      let eligible = -1;
      for (let index = 0; index < bucket.waiting.length; index++) {
        const candidate = bucket.waiting[index];
        if (candidate === undefined) continue;
        const subkey = sublimitKey(candidate.method, candidate.route);
        const deadline = sublimits.get(subkey) ?? 0;
        if (now >= deadline) {
          eligible = index;
          break;
        }
        yield* scheduleWake(`sublimit:${subkey}`, deadline, now);
      }
      if (eligible === -1) continue;

      // A known window has expired. Start its new window conservatively.
      if (bucket.resetAt > 0 && now >= bucket.resetAt) {
        bucket.remaining = bucket.limit;
        bucket.resetAt = 0;
      }

      if (Option.isSome(bucket.remaining) && bucket.remaining.value === 0) {
        if (now < bucket.resetAt) {
          yield* scheduleWake(key, bucket.resetAt, now);
          continue;
        }

        // No usable reset deadline was supplied; avoid an uncontrolled burst.
        bucket.remaining = Option.some(1);
      }

      const waiter = bucket.waiting.splice(eligible, 1)[0];
      if (waiter === undefined) continue;

      const decremented = Option.isSome(bucket.remaining) && bucket.remaining.value > 0;
      bucket.inFlight += 1;
      bucket.lastUsedAt = now;
      globalAdmissions.push(now);
      bucket.remaining = Option.map(bucket.remaining, (remaining) => Math.max(0, remaining - 1));
      active.set(waiter.id, { key, decremented });

      yield* Deferred.succeed(waiter.reply, {
        id: waiter.id,
        method: waiter.method,
        route: waiter.route,
      });
      if (globalAdmissions.length === 50) {
        const oldest = globalAdmissions[0];
        if (oldest !== undefined) yield* scheduleWake("global", oldest + 1_000, now);
        break;
      }
    }
  });

  const release = (id: number, now: number, refundRemaining = false): void => {
    const entry = active.get(id);
    if (entry === undefined) return;

    active.delete(id);
    const bucket = buckets.get(entry.key);
    if (bucket !== undefined) {
      bucket.inFlight = Math.max(0, bucket.inFlight - 1);
      bucket.lastUsedAt = now;
      if (refundRemaining && entry.decremented && Option.isSome(bucket.remaining)) {
        const refunded = bucket.remaining.value + 1;
        bucket.remaining = Option.some(
          Option.isSome(bucket.limit) ? Math.min(bucket.limit.value, refunded) : refunded,
        );
      }
    }
  };

  const removeWaiting = (id: number): void => {
    for (const bucket of buckets.values()) {
      const index = bucket.waiting.findIndex((waiter) => waiter.id === id);
      if (index !== -1) {
        bucket.waiting.splice(index, 1);
        return;
      }
    }
  };

  const handle = (command: Command) =>
    Command.$match(command, {
      Acquire: ({ waiter }) =>
        Effect.sync(() => {
          const provisional = provisionalKey(waiter.method, waiter.route);
          if (Option.isNone(provisional)) return;

          const knownHash = aliases.get(routeKey(waiter.method, waiter.route));
          const key =
            knownHash === undefined ? provisional.value : discoveredKey(waiter.route, knownHash);

          getBucket(key).waiting.push(waiter);
        }),

      Observe: ({ permit, headers, status, reply }) =>
        Effect.gen(function* () {
          const activePermit = active.get(permit.id);
          if (activePermit !== undefined) {
            const now = yield* Clock.currentTimeMillis;
            const originalKey = activePermit.key;
            release(permit.id, now);
            let key = originalKey;
            let bucket = getBucket(key);

            if (Option.isSome(headers.bucket)) {
              const hash = headers.bucket.value;
              aliases.set(routeKey(permit.method, permit.route), hash);
              const discovered = discoveredKey(permit.route, hash);

              if (discovered !== key) {
                const target = getBucket(discovered);
                target.waiting.push(...bucket.waiting);
                target.waiting.sort((a, b) => a.id - b.id);
                bucket.waiting.length = 0;
                target.blockedUntil = Math.max(target.blockedUntil, bucket.blockedUntil);
                target.resetAt = Math.max(target.resetAt, bucket.resetAt);
                target.limit = Option.isSome(target.limit) ? target.limit : bucket.limit;
                if (Option.isSome(bucket.remaining)) {
                  target.remaining = Option.isSome(target.remaining)
                    ? Option.some(Math.min(target.remaining.value, bucket.remaining.value))
                    : bucket.remaining;
                }

                // Preserve active reservations if aliases are discovered in
                // different orders while another request is still in flight.
                for (const entry of active.values()) {
                  if (entry.key === key) entry.key = discovered;
                }
                target.inFlight += bucket.inFlight;
                bucket.inFlight = 0;
                buckets.delete(key);
                yield* cancelWake(key);

                key = discovered;
                bucket = target;
              }
            }

            bucket.lastUsedAt = now;
            if (Option.isSome(headers.limit)) bucket.limit = headers.limit;
            if (Option.isSome(headers.remaining)) {
              // Other requests may already be in flight in the discovered bucket.
              const reported = Math.max(0, headers.remaining.value - bucket.inFlight);
              bucket.remaining = Option.some(
                Option.isSome(bucket.remaining)
                  ? Math.min(bucket.remaining.value, reported)
                  : reported,
              );
              for (const entry of active.values()) {
                if (entry.key === key) entry.decremented = false;
              }
            }

            if (Option.isSome(headers.resetAfter)) {
              bucket.resetAt = now + Duration.toMillis(headers.resetAfter.value);
            } else if (Option.isSome(headers.resetAt)) {
              bucket.resetAt = headers.resetAt.value;
            }

            if (status === 429) {
              const delay = Option.getOrElse(
                Option.orElse(headers.retryAfter, () => headers.resetAfter),
                () => Duration.seconds(1),
              );
              const until = now + Duration.toMillis(delay);

              if (headers.global) {
                globalBlockedUntil = Math.max(globalBlockedUntil, until);
              } else if (Option.isSome(headers.scope) && headers.scope.value === "shared") {
                const key = sublimitKey(permit.method, permit.route);
                const deadline = Math.max(sublimits.get(key) ?? 0, until);
                sublimits.set(key, deadline);
                yield* scheduleWake(`sublimit:${key}`, deadline, now);
              } else {
                bucket.blockedUntil = Math.max(bucket.blockedUntil, until);
                bucket.remaining = Option.some(0);
                bucket.resetAt = Math.max(bucket.resetAt, until);
              }
            } else if (
              Option.isSome(bucket.remaining) &&
              bucket.remaining.value === 0 &&
              bucket.resetAt <= now
            ) {
              // Missing reset headers: don't admit an immediate unbounded burst.
              bucket.blockedUntil = Math.max(bucket.blockedUntil, now + 1_000);
            }
          }

          yield* Deferred.succeed(reply, undefined);
        }),

      Release: ({ id, reply }) =>
        Effect.gen(function* () {
          release(id, yield* Clock.currentTimeMillis);
          yield* Deferred.succeed(reply, undefined);
        }),

      Cancel: ({ id }) =>
        Effect.gen(function* () {
          removeWaiting(id);
          release(id, yield* Clock.currentTimeMillis, true);
        }),

      Wake: ({ key, deadline }) =>
        Effect.sync(() => {
          if (wakes.get(key)?.deadline !== deadline) return;
          wakes.delete(key);
          if (key.startsWith("sublimit:")) {
            const subkey = key.slice("sublimit:".length);
            if ((sublimits.get(subkey) ?? 0) <= deadline) sublimits.delete(subkey);
          }
        }),
    }).pipe(Effect.andThen(drain));

  const actor = yield* Effect.gen(function* () {
    while (true) {
      const command = yield* Queue.take(inbox);
      yield* handle(command);
    }
  }).pipe(Effect.forkScoped);

  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      closed = true;
      yield* Queue.shutdown(inbox);
      yield* Fiber.interrupt(actor);
      for (const reply of pendingAcquires) {
        yield* Deferred.interrupt(reply);
      }
      pendingAcquires.clear();
      for (const reply of pendingAcks) {
        yield* Deferred.succeed(reply, undefined);
      }
      pendingAcks.clear();
    }),
  );

  const sendCancel = (id: number) =>
    Effect.suspend(() =>
      closed ? Effect.void : Queue.offer(inbox, Command.Cancel({ id })).pipe(Effect.asVoid),
    );

  const acquireMasked = (
    method: HttpMethod,
    route: Route,
    restore: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  ): Effect.Effect<Option.Option<Permit>> =>
    Effect.gen(function* () {
      if (closed) return yield* Effect.interrupt;

      const provisional = provisionalKey(method, route);
      if (Option.isNone(provisional)) return Option.none<Permit>();

      const id = yield* Ref.updateAndGet(ids, (n) => n + 1);
      const reply = yield* Deferred.make<Permit>();
      const waiter: Waiter = { id, method, route, reply };
      pendingAcquires.add(reply);

      const permit = yield* restore(
        Effect.gen(function* () {
          const offered = yield* Queue.offer(inbox, Command.Acquire({ waiter }));
          if (!offered) return yield* Effect.interrupt;
          return yield* Deferred.await(reply);
        }),
      ).pipe(
        Effect.onInterrupt(() => sendCancel(id)),
        Effect.ensuring(
          Effect.sync(() => {
            pendingAcquires.delete(reply);
          }),
        ),
      );

      return Option.some(permit);
    });

  const sendAck = (makeCommand: (reply: Deferred.Deferred<void>) => Command) =>
    Effect.uninterruptibleMask((restore) =>
      Effect.gen(function* () {
        if (closed) return;

        const reply = yield* Deferred.make<void>();
        pendingAcks.add(reply);

        yield* Effect.gen(function* () {
          const offered = yield* restore(Queue.offer(inbox, makeCommand(reply)));
          if (!offered) return;
          yield* restore(Deferred.await(reply));
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              pendingAcks.delete(reply);
            }),
          ),
        );
      }),
    );

  const acquire = (method: HttpMethod, route: Route) =>
    Effect.uninterruptibleMask((restore) => acquireMasked(method, route, restore));

  const observe = (permit: Permit, headers: RateLimitHeaders, status: number) =>
    sendAck((reply) => Command.Observe({ permit, headers, status, reply }));

  const releasePermit = (permit: Permit) =>
    sendAck((reply) => Command.Release({ id: permit.id, reply }));

  const withPermit = <A, E, R>(
    method: HttpMethod,
    route: Route,
    use: (permit: Option.Option<Permit>) => Effect.Effect<A, E, R>,
  ) =>
    Effect.uninterruptibleMask((restore) =>
      Effect.gen(function* () {
        // Waiting for admission stays interruptible while the handoff from
        // receiving a permit to registering its release remains masked.
        const permit = yield* acquireMasked(method, route, restore);
        return yield* restore(use(permit)).pipe(
          Effect.ensuring(
            Option.match(permit, {
              onNone: () => Effect.void,
              onSome: releasePermit,
            }),
          ),
        );
      }),
    );

  return { acquire, observe, release: releasePermit, withPermit } as const;
});

export type RateLimitCoordinator = Effect.Success<typeof make>;
