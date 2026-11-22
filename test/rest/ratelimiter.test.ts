import { expect, test } from "bun:test";
import { Deferred, Effect, Exit, Fiber, Option, Scope } from "effect";
import { Headers } from "effect/http";
import { TestClock } from "effect/testing";

import { make, type Permit } from "@/rest/ratelimiter/coordinator";
import { parseRateLimitHeaders } from "@/rest/ratelimiter/headers";
import type { Route } from "@/rest/types";

const route = (pattern: string, path = pattern): Route => ({
  _tag: pattern,
  path,
  pattern,
  rateLimit: { kind: "Path", major: Option.none() },
});

const headers = (input: Record<string, string> = {}) =>
  parseRateLimitHeaders(Headers.fromInput(input));

const permit = (value: Option.Option<Permit>): Permit => {
  if (Option.isNone(value)) throw new Error("Expected a permit");
  return value.value;
};

const run = <A, E>(program: Effect.Effect<A, E, Scope.Scope | TestClock.TestClock>) =>
  Effect.runPromise(Effect.provide(Effect.scoped(program), TestClock.layer()));

test("same bucket waits FIFO and respects remaining count and reset", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/same");
      const first = permit(yield* coordinator.acquire("GET", r));
      const secondFiber = yield* coordinator.acquire("GET", r).pipe(Effect.forkChild);
      const thirdFiber = yield* coordinator.acquire("GET", r).pipe(Effect.forkChild);
      yield* Effect.yieldNow;

      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-limit": "2",
          "x-ratelimit-remaining": "1",
          "x-ratelimit-reset-after": "0.25",
        }),
        200,
      );
      const second = permit(yield* Fiber.join(secondFiber));
      expect(yield* Fiber.await(thirdFiber).pipe(Effect.timeoutOption(0))).toEqual(Option.none());

      yield* coordinator.observe(
        second,
        headers({
          "x-ratelimit-limit": "2",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "0.25",
        }),
        200,
      );
      yield* TestClock.adjust("249 millis");
      expect(yield* Fiber.await(thirdFiber).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      const third = permit(yield* Fiber.join(thirdFiber));
      expect(second.id).toBeLessThan(third.id);
      yield* coordinator.release(third);
    }),
  );
});

test("independent buckets admit concurrently", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const first = permit(yield* coordinator.acquire("GET", route("/a")));
      const second = permit(yield* coordinator.acquire("GET", route("/b")));
      expect(first.id).not.toBe(second.id);
      yield* coordinator.release(first);
      yield* coordinator.release(second);
    }),
  );
});

test("proactive global budget admits at most 50 requests per rolling second", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      for (let i = 0; i < 50; i++) {
        const current = permit(yield* coordinator.acquire("GET", route(`/global/${i}`)));
        yield* coordinator.release(current);
      }
      const next = yield* coordinator.acquire("GET", route("/global/next")).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("999 millis");
      expect(yield* Fiber.await(next).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      yield* coordinator.release(permit(yield* Fiber.join(next)));
    }),
  );
});

test("shared-resource 429 does not block another route in the discovered bucket", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const a = route("/shared/a");
      const b = route("/shared/b");
      const first = permit(yield* coordinator.acquire("GET", a));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-bucket": "same-hash",
          "x-ratelimit-scope": "shared",
          "retry-after": "0.5",
          "x-ratelimit-remaining": "1",
        }),
        429,
      );
      const other = permit(yield* coordinator.acquire("GET", b));
      yield* coordinator.observe(
        other,
        headers({
          "x-ratelimit-bucket": "same-hash",
          "x-ratelimit-remaining": "1",
        }),
        200,
      );
      const retryA = yield* coordinator.acquire("GET", a).pipe(Effect.forkChild);
      const nextB = permit(yield* coordinator.acquire("GET", b));
      yield* coordinator.release(nextB);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("500 millis");
      yield* coordinator.release(permit(yield* Fiber.join(retryA)));
    }),
  );
});

test("shared 429 isolates resolved resources of one route pattern", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const pattern = "/channels/{channelId}/messages";
      const a = route(pattern, "/channels/1/messages");
      const b = route(pattern, "/channels/2/messages");
      const first = permit(yield* coordinator.acquire("GET", a));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-scope": "shared",
          "retry-after": "0.125",
          "x-ratelimit-remaining": "1",
        }),
        429,
      );
      const other = permit(yield* coordinator.acquire("GET", b));
      yield* coordinator.release(other);
      const blocked = yield* coordinator.acquire("GET", a).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("124 millis");
      expect(yield* Fiber.await(blocked).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      yield* coordinator.release(permit(yield* Fiber.join(blocked)));
    }),
  );
});

test("global 429 blocks other routes for fractional seconds", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const first = permit(yield* coordinator.acquire("GET", route("/a")));
      yield* coordinator.observe(
        first,
        headers({
          "retry-after": "0.125",
          "x-ratelimit-scope": "global",
        }),
        429,
      );
      const next = yield* coordinator.acquire("GET", route("/b")).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("124 millis");
      expect(yield* Fiber.await(next).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      yield* coordinator.release(permit(yield* Fiber.join(next)));
    }),
  );
});

test("hash discovery merges route queues and active reservations", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const a = route("/a");
      const b = route("/b");
      const first = permit(yield* coordinator.acquire("GET", a));
      const other = permit(yield* coordinator.acquire("GET", b));
      const waiting = yield* coordinator.acquire("GET", a).pipe(Effect.forkChild);
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-bucket": "shared",
          "x-ratelimit-limit": "1",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "0.2",
        }),
        200,
      );
      yield* coordinator.observe(
        other,
        headers({
          "x-ratelimit-bucket": "shared",
          "x-ratelimit-limit": "1",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "0.2",
        }),
        200,
      );
      yield* Effect.yieldNow;
      yield* TestClock.adjust("200 millis");
      yield* coordinator.release(permit(yield* Fiber.join(waiting)));
    }),
  );
});

test("reconciliation keeps a discovered bucket's active reservation", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const a = route("/merge/a");
      const b = route("/merge/b");
      const first = permit(yield* coordinator.acquire("GET", a));
      const other = permit(yield* coordinator.acquire("GET", b));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-bucket": "merged",
          "x-ratelimit-limit": "3",
          "x-ratelimit-remaining": "2",
        }),
        200,
      );
      const active = permit(yield* coordinator.acquire("GET", a));
      yield* coordinator.observe(
        other,
        headers({
          "x-ratelimit-bucket": "merged",
          "x-ratelimit-limit": "3",
          "x-ratelimit-remaining": "1",
          "x-ratelimit-reset-after": "0.1",
        }),
        200,
      );
      const waiting = yield* coordinator.acquire("GET", b).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* coordinator.release(active);
      expect(yield* Fiber.await(waiting).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("100 millis");
      yield* coordinator.release(permit(yield* Fiber.join(waiting)));
    }),
  );
});

test("cancellation removes a waiter and releases an acquired reservation", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/cancel");
      const first = permit(yield* coordinator.acquire("GET", r));
      const waiting = yield* coordinator.acquire("GET", r).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(waiting);
      yield* coordinator.release(first);

      const entered = yield* Deferred.make<void>();
      const active = yield* coordinator
        .withPermit("GET", r, () =>
          Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never)),
        )
        .pipe(Effect.forkChild);
      yield* Deferred.await(entered);
      yield* Fiber.interrupt(active);
      yield* coordinator.release(permit(yield* coordinator.acquire("GET", r)));
    }),
  );
});

test("withPermit can be interrupted while waiting behind an active permit", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/queued-active-cancel");
      const first = permit(yield* coordinator.acquire("GET", r));

      let executed = false;
      const waiting = yield* coordinator
        .withPermit("GET", r, () =>
          Effect.sync(() => {
            executed = true;
          }),
        )
        .pipe(Effect.forkChild);
      yield* Effect.yieldNow;

      const interrupted = yield* Fiber.interrupt(waiting).pipe(Effect.timeoutOption(0));
      expect(Option.isSome(interrupted)).toBe(true);
      expect(executed).toBe(false);

      yield* coordinator.release(first);
      const next = permit(yield* coordinator.acquire("GET", r));
      expect(executed).toBe(false);
      yield* coordinator.release(next);
    }),
  );
});

test("withPermit cancellation racing with permit admission does not leak or stall quota", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/cancel-admit-race");

      // Establish a 2-request bucket with a long reset window and 2 remaining.
      const seed = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(
        seed,
        headers({
          "x-ratelimit-limit": "2",
          "x-ratelimit-remaining": "2",
          "x-ratelimit-reset-after": "600",
        }),
        200,
      );

      // Hold the bucket with A (remaining drops 2 -> 1), queue B via withPermit.
      const first = permit(yield* coordinator.acquire("GET", r));
      const waiting = yield* coordinator
        .withPermit("GET", r, () => Effect.never)
        .pipe(Effect.forkChild);
      yield* Effect.yieldNow;

      // Release A and immediately interrupt B without yielding between them so
      // admission and cancellation race on the remaining permit.
      yield* coordinator.release(first);
      yield* Fiber.interrupt(waiting);

      // Bucket must remain usable immediately without advancing the 10-minute clock.
      const next = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.release(next);
    }),
  );
});

test("cancelling waiters while the command queue is full does not deadlock", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/full-queue");
      const first = permit(yield* coordinator.acquire("GET", r));

      // Overfill the 1,024-capacity command queue before yielding to the actor.
      const waiters: Array<Fiber.Fiber<void>> = [];
      for (let i = 0; i < 1_050; i++) {
        const fiber = yield* coordinator
          .withPermit("GET", r, () => Effect.void)
          .pipe(Effect.forkChild);
        waiters.push(fiber);
      }

      yield* Fiber.interruptAll(waiters);
      yield* coordinator.release(first);
      const next = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.release(next);
    }),
  );
});

test("closing the coordinator scope wakes queued waiters and unblocks release/observe", async () => {
  await run(
    Effect.gen(function* () {
      const coordinatorScope = yield* Scope.make();
      const coordinator = yield* Scope.provide(coordinatorScope)(make);
      const blockedRoute = route("/shutdown-blocked");
      const activeRoute = route("/shutdown-active");

      const first = permit(yield* coordinator.acquire("GET", blockedRoute));
      let waitingExecuted = false;
      const waiting = yield* coordinator
        .withPermit("GET", blockedRoute, () =>
          Effect.sync(() => {
            waitingExecuted = true;
          }),
        )
        .pipe(Effect.forkChild);

      const entered = yield* Deferred.make<void>();
      const finishActive = yield* Deferred.make<void>();
      const active = yield* coordinator
        .withPermit("GET", activeRoute, () =>
          Deferred.succeed(entered, undefined).pipe(Effect.andThen(Deferred.await(finishActive))),
        )
        .pipe(Effect.forkChild);

      yield* Deferred.await(entered);
      yield* Effect.yieldNow;

      yield* Scope.close(coordinatorScope, Exit.void);

      // Queued waiter must exit promptly with interruption rather than hanging.
      const waitingExit = yield* Fiber.await(waiting);
      expect(Exit.hasInterrupts(waitingExit)).toBe(true);
      expect(waitingExecuted).toBe(false);

      // In-flight withPermit finalizer (releasePermit) must complete promptly after shutdown.
      yield* Deferred.succeed(finishActive, undefined);
      const activeExit = yield* Fiber.await(active);
      expect(Exit.isSuccess(activeExit)).toBe(true);

      // Post-shutdown calls must not strand callers.
      const postAcquire = yield* Effect.exit(
        coordinator.withPermit("GET", blockedRoute, () => Effect.void),
      );
      expect(Exit.hasInterrupts(postAcquire)).toBe(true);
      yield* coordinator.observe(first, headers({ "x-ratelimit-remaining": "0" }), 200);
      yield* coordinator.release(first);
    }),
  );
});

test("withPermit can be interrupted while waiting for admission", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/queued-cancel");
      const first = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-limit": "1",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "600",
        }),
        200,
      );
      let executed = false;
      const waiting = yield* coordinator
        .withPermit("GET", r, () =>
          Effect.sync(() => {
            executed = true;
          }),
        )
        .pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(waiting);
      expect(executed).toBe(false);
      yield* TestClock.adjust("10 minutes");
      expect(executed).toBe(false);
      yield* coordinator.release(permit(yield* coordinator.acquire("GET", r)));
    }),
  );
});

test("idle cleanup preserves active permits and queued waiters", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/long-running");
      const first = permit(yield* coordinator.acquire("GET", r));
      const waiting = yield* coordinator.acquire("GET", r).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("6 minutes");
      expect(yield* Fiber.await(waiting).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* coordinator.release(first);
      yield* coordinator.release(permit(yield* Fiber.join(waiting)));
    }),
  );
});

test("idle cleanup retains an unexpired bucket window", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/long-window");
      const first = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-limit": "1",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "600",
        }),
        200,
      );
      yield* Effect.yieldNow;
      yield* TestClock.adjust("5 minutes");
      const waiting = yield* coordinator.acquire("GET", r).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      expect(yield* Fiber.await(waiting).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("5 minutes");
      yield* coordinator.release(permit(yield* Fiber.join(waiting)));
    }),
  );
});

test("missing reset headers delay a zero-remaining bucket conservatively", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/partial");
      const first = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(first, headers({ "x-ratelimit-remaining": "0" }), 200);
      const next = yield* coordinator.acquire("GET", r).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("999 millis");
      expect(yield* Fiber.await(next).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      yield* coordinator.release(permit(yield* Fiber.join(next)));
    }),
  );
});

test("observe adopts new window remaining after prior reset expires while in flight", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/window-rollover");
      const first = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "1",
          "x-ratelimit-reset-after": "1",
        }),
        200,
      );

      // Consumes the last remaining permit in the first window (remaining 1 -> 0).
      const second = permit(yield* coordinator.acquire("GET", r));
      // Window expires before Discord responds in the new window.
      yield* TestClock.adjust("1100 millis");
      yield* coordinator.observe(
        second,
        headers({
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "4",
          "x-ratelimit-reset-after": "10",
        }),
        200,
      );

      // Must admit immediately in the new window instead of stalling for 10s.
      const third = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.release(third);
    }),
  );
});

test("observe adopts expanded quota when drain already cleared an expired window", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const r = route("/window-expanded");
      const first = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-limit": "1",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "1",
        }),
        200,
      );

      yield* TestClock.adjust("1 second");
      const second = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.observe(
        second,
        headers({
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "4",
          "x-ratelimit-reset-after": "10",
        }),
        200,
      );

      const third = permit(yield* coordinator.acquire("GET", r));
      yield* coordinator.release(third);
    }),
  );
});

test("stale headers from an older reset window do not clobber a newer window", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const a = route("/stale/a");
      const b = route("/stale/b");
      const newer = permit(yield* coordinator.acquire("GET", a));
      const older = permit(yield* coordinator.acquire("GET", b));

      yield* coordinator.observe(
        newer,
        headers({
          "x-ratelimit-bucket": "windowed",
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "4",
          "x-ratelimit-reset": "20",
          "x-ratelimit-reset-after": "10",
        }),
        200,
      );
      yield* coordinator.observe(
        older,
        headers({
          "x-ratelimit-bucket": "windowed",
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "10",
          "x-ratelimit-reset-after": "0.1",
        }),
        200,
      );

      const next = permit(yield* coordinator.acquire("GET", a));
      yield* coordinator.release(next);
    }),
  );
});

test("superseded earlier wake-up does not unblock a bucket before its later deadline", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const a = route("/wake/a");
      const b = route("/wake/b");
      const first = permit(yield* coordinator.acquire("GET", a));
      const second = permit(yield* coordinator.acquire("GET", b));

      yield* coordinator.observe(
        first,
        headers({
          "x-ratelimit-bucket": "wake-bucket",
          "x-ratelimit-limit": "1",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset-after": "0.1",
        }),
        200,
      );

      const waiting = yield* coordinator.acquire("GET", a).pipe(Effect.forkChild);
      yield* Effect.yieldNow;

      // Second response merges into the same bucket with a later 500ms 429 deadline.
      yield* coordinator.observe(
        second,
        headers({
          "x-ratelimit-bucket": "wake-bucket",
          "retry-after": "0.5",
        }),
        429,
      );

      yield* TestClock.adjust("100 millis");
      expect(yield* Fiber.await(waiting).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("399 millis");
      expect(yield* Fiber.await(waiting).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      yield* coordinator.release(permit(yield* Fiber.join(waiting)));
    }),
  );
});

test("multiple aliases merging into an active bucket preserve FIFO order and active count", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const a = route("/multi/a");
      const b = route("/multi/b");
      const c = route("/multi/c");

      const firstA = permit(yield* coordinator.acquire("GET", a));
      const firstB = permit(yield* coordinator.acquire("GET", b));
      const firstC = permit(yield* coordinator.acquire("GET", c));

      yield* coordinator.observe(
        firstA,
        headers({
          "x-ratelimit-bucket": "multi-hash",
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "4",
          "x-ratelimit-reset-after": "1",
        }),
        200,
      );

      const activeA = permit(yield* coordinator.acquire("GET", a));
      const waitB = yield* coordinator.acquire("GET", b).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      const waitC = yield* coordinator.acquire("GET", c).pipe(Effect.forkChild);
      yield* Effect.yieldNow;

      yield* coordinator.observe(
        firstB,
        headers({
          "x-ratelimit-bucket": "multi-hash",
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "3",
          "x-ratelimit-reset-after": "1",
        }),
        200,
      );
      yield* coordinator.observe(
        firstC,
        headers({
          "x-ratelimit-bucket": "multi-hash",
          "x-ratelimit-limit": "5",
          "x-ratelimit-remaining": "3",
          "x-ratelimit-reset-after": "1",
        }),
        200,
      );

      // Neither merged waiter may run while activeA is still in flight.
      expect(yield* Fiber.await(waitB).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      expect(yield* Fiber.await(waitC).pipe(Effect.timeoutOption(0))).toEqual(Option.none());

      yield* coordinator.release(activeA);
      const permitB = permit(yield* Fiber.join(waitB));
      expect(yield* Fiber.await(waitC).pipe(Effect.timeoutOption(0))).toEqual(Option.none());

      yield* coordinator.release(permitB);
      const permitC = permit(yield* Fiber.join(waitC));
      expect(permitB.id).toBeLessThan(permitC.id);
      yield* coordinator.release(permitC);
    }),
  );
});

test("RateLimitKind.None still participates in the global budget and global 429s by default", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const unbucketed: Route = {
        _tag: "Unbucketed",
        path: "/gateway",
        pattern: "/gateway",
        rateLimit: { kind: "None", major: Option.none() },
      };

      // Concurrent admissions succeed without per-bucket serialization.
      const concurrentA = permit(yield* coordinator.acquire("GET", unbucketed));
      const concurrentB = permit(yield* coordinator.acquire("GET", unbucketed));
      expect(concurrentA.id).not.toBe(concurrentB.id);

      // Consume the remaining 48 slots in the rolling 50 req/s global window.
      for (let i = 0; i < 48; i++) {
        yield* coordinator.release(permit(yield* coordinator.acquire("GET", unbucketed)));
      }
      const blockedByBudget = yield* coordinator.acquire("GET", unbucketed).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("999 millis");
      expect(yield* Fiber.await(blockedByBudget).pipe(Effect.timeoutOption(0))).toEqual(
        Option.none(),
      );
      yield* TestClock.adjust("1 millis");
      const admitted = permit(yield* Fiber.join(blockedByBudget));

      // A global 429 observed on a None route blocks other routes.
      yield* coordinator.observe(
        admitted,
        headers({ "retry-after": "0.2", "x-ratelimit-scope": "global" }),
        429,
      );
      const other = yield* coordinator.acquire("GET", route("/other")).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("199 millis");
      expect(yield* Fiber.await(other).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      yield* TestClock.adjust("1 millis");
      yield* coordinator.release(permit(yield* Fiber.join(other)));
      yield* coordinator.release(concurrentA);
      yield* coordinator.release(concurrentB);
    }),
  );
});

test("global-exempt routes bypass bot global blocks while preserving per-bucket limits", async () => {
  await run(
    Effect.gen(function* () {
      const coordinator = yield* make;
      const exemptNone: Route = {
        _tag: "InteractionCallback",
        path: "/interactions/1/tok/callback",
        pattern: "/interactions/{id}/{token}/callback",
        rateLimit: { kind: "None", major: Option.none(), global: false },
      };
      const exemptWebhook: Route = {
        _tag: "ExecuteWebhook",
        path: "/webhooks/1/tok",
        pattern: "/webhooks/{id}/{token}",
        rateLimit: { kind: "Major", major: Option.some(["1", "tok"]), global: false },
      };

      // Trigger a bot-wide global 429.
      const botPermit = permit(yield* coordinator.acquire("GET", route("/users/@me")));
      yield* coordinator.observe(
        botPermit,
        headers({ "retry-after": "5", "x-ratelimit-scope": "global" }),
        429,
      );

      // Fully exempt route bypasses coordinator altogether.
      expect(yield* coordinator.acquire("POST", exemptNone)).toEqual(Option.none());

      // Global-exempt webhook route is admitted during the bot global 429,
      // while still enforcing its own per-webhook bucket.
      const webhookFirst = permit(yield* coordinator.acquire("POST", exemptWebhook));
      const webhookSecond = yield* coordinator
        .acquire("POST", exemptWebhook)
        .pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      expect(yield* Fiber.await(webhookSecond).pipe(Effect.timeoutOption(0))).toEqual(
        Option.none(),
      );
      yield* coordinator.release(webhookFirst);
      yield* coordinator.release(permit(yield* Fiber.join(webhookSecond)));
    }),
  );
});
