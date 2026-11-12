import { expect, test } from "bun:test";
import { Deferred, Effect, Fiber, Option } from "effect";
import type { Scope } from "effect";
import { Headers } from "effect/http";
import { TestClock } from "effect/testing";

import { make, type Permit } from "@/rest/ratelimiter/coordinator";
import { parseRateLimitHeaders } from "@/rest/ratelimiter/headers";
import type { Route } from "@/rest/types";

const route = (pattern: string): Route => ({
  _tag: pattern,
  path: pattern,
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
