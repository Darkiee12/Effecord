
import { Clock, Data, Deferred, Duration, Effect, Option, Queue, Ref } from "effect";
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
}

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
  const active = new Map<number, string>();
  const wakes = new Map<string, number>();
  let globalBlockedUntil = 0;

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
      };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  const scheduleWake = (key: string, deadline: number, now: number) =>
    Effect.gen(function* () {
      const previous = wakes.get(key);
      // An already-scheduled earlier wake can reassess a later deadline.
      if (previous !== undefined && previous <= deadline) return;

      wakes.set(key, deadline);
      yield* Effect.sleep(Duration.millis(Math.max(0, deadline - now))).pipe(
        Effect.andThen(Queue.offer(inbox, Command.Wake({ key, deadline }))),
        Effect.forkScoped,
      );
    });

  const drain = Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis;

    if (now < globalBlockedUntil) {
      yield* scheduleWake("global", globalBlockedUntil, now);
      return;
    }

    for (const [key, bucket] of buckets) {
      if (bucket.waiting.length === 0 || bucket.inFlight !== 0) continue;

      if (now < bucket.blockedUntil) {
        yield* scheduleWake(key, bucket.blockedUntil, now);
        continue;
      }

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

      const waiter = bucket.waiting.shift();
      if (waiter === undefined) continue;

      bucket.inFlight += 1;
      bucket.remaining = Option.map(bucket.remaining, (remaining) => Math.max(0, remaining - 1));
      active.set(waiter.id, key);

      yield* Deferred.succeed(waiter.reply, {
        id: waiter.id,
        method: waiter.method,
        route: waiter.route,
      });
    }
  });

  const release = (id: number): void => {
    const key = active.get(id);
    if (key === undefined) return;

    active.delete(id);
    const bucket = buckets.get(key);
    if (bucket !== undefined) bucket.inFlight = Math.max(0, bucket.inFlight - 1);
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
          const key = knownHash === undefined
            ? provisional.value
            : discoveredKey(waiter.route, knownHash);

          getBucket(key).waiting.push(waiter);
        }),

      Observe: ({ permit, headers, status, reply }) =>
        Effect.gen(function* () {
          const originalKey = active.get(permit.id);
          if (originalKey !== undefined) {
            release(permit.id);
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

                // Preserve active reservations if aliases are discovered in
                // different orders while another request is still in flight.
                for (const [id, activeKey] of active) {
                  if (activeKey === key) active.set(id, discovered);
                }
                target.inFlight += bucket.inFlight;
                bucket.inFlight = 0;
                buckets.delete(key);

                key = discovered;
                bucket = target;
              }
            }

            const now = yield* Clock.currentTimeMillis;
            if (Option.isSome(headers.limit)) bucket.limit = headers.limit;
            if (Option.isSome(headers.remaining)) {
              // Other requests may already be in flight in the discovered bucket.
              const reported = Math.max(0, headers.remaining.value - bucket.inFlight);
              bucket.remaining = Option.some(
                Option.isSome(bucket.remaining)
                  ? Math.min(bucket.remaining.value, reported)
                  : reported,
              );
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
              bucket.resetAt = now + 1_000;
            }
          }

          yield* Deferred.succeed(reply, undefined);
        }),

      Release: ({ id, reply }) =>
        Effect.gen(function* () {
          release(id);
          yield* Deferred.succeed(reply, undefined);
        }),

      Cancel: ({ id }) =>
        Effect.sync(() => {
          removeWaiting(id);
          release(id);
        }),

      Wake: ({ key, deadline }) =>
        Effect.sync(() => {
          if (wakes.get(key) === deadline) wakes.delete(key);
        }),
    }).pipe(Effect.andThen(drain));

  yield* Effect.gen(function* () {
    while (true) {
      const command = yield* Queue.take(inbox);
      yield* handle(command);
    }
  }).pipe(Effect.forkScoped);

  yield* Effect.addFinalizer(() => Queue.shutdown(inbox).pipe(Effect.asVoid));

  const acquire = (method: HttpMethod, route: Route) =>
    Option.match(provisionalKey(method, route), {
      onNone: () => Effect.succeed(Option.none<Permit>()),
      onSome: () =>
        Effect.gen(function* () {
          const id = yield* Ref.updateAndGet(ids, (n) => n + 1);
          const reply = yield* Deferred.make<Permit>();
          const waiter: Waiter = { id, method, route, reply };

          const permit = yield* Effect.gen(function* () {
            yield* Queue.offer(inbox, Command.Acquire({ waiter }));
            return yield* Deferred.await(reply);
          }).pipe(
            Effect.onInterrupt(() =>
              Queue.offer(inbox, Command.Cancel({ id })).pipe(Effect.asVoid),
            ),
          );

          return Option.some(permit);
        }),
    });

  const observe = (permit: Permit, headers: RateLimitHeaders, status: number) =>
    Effect.gen(function* () {
      const reply = yield* Deferred.make<void>();
      yield* Queue.offer(inbox, Command.Observe({ permit, headers, status, reply }));
      yield* Deferred.await(reply);
    });

  const releasePermit = (permit: Permit) =>
    Effect.gen(function* () {
      const reply = yield* Deferred.make<void>();
      yield* Queue.offer(inbox, Command.Release({ id: permit.id, reply }));
      yield* Deferred.await(reply);
    });

  const withPermit = <A, E, R>(
    method: HttpMethod,
    route: Route,
    use: (permit: Option.Option<Permit>) => Effect.Effect<A, E, R>,
  ) =>
    Effect.acquireUseRelease(
      acquire(method, route),
      use,
      (permit) =>
        Option.match(permit, {
          onNone: () => Effect.void,
          onSome: releasePermit,
        }),
    );

  return { acquire, observe, release: releasePermit, withPermit } as const;
});

export type RateLimitCoordinator = Effect.Success<typeof make>;
