import { expect, test } from "bun:test";
import { Deferred, Effect, Fiber, Layer, Redacted, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { TestClock } from "effect/testing";

import { DiscordRest } from "@/rest/client";
import { DiscordApiError, DiscordErrorBody } from "@/rest/error";

const user = {
  id: "123",
  username: "rate-limit-test",
  discriminator: "0",
  global_name: null,
  avatar: null,
};

const response = (
  request: Parameters<typeof HttpClientResponse.fromWeb>[0],
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) =>
  HttpClientResponse.fromWeb(
    request,
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    }),
  );

const runRest = <A, E>(
  http: HttpClient.HttpClient,
  program: Effect.Effect<A, E, DiscordRest | TestClock.TestClock>,
) =>
  Effect.runPromise(
    Effect.provide(
      program,
      DiscordRest.layer(Redacted.make("test-token")).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
        Layer.provideMerge(TestClock.layer()),
      ),
    ),
  );

test("fractional retry_after decodes as seconds", () => {
  const body = Schema.decodeSync(DiscordErrorBody)({
    message: "limited",
    retry_after: 0.125,
    global: false,
  });
  expect(body.retryAfter).toBe(0.125);
});

test("429 body deadline reaches the coordinator before retry", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      return calls === 1
        ? response(request, 429, { message: "limited", retry_after: 0.125 })
        : response(request, 200, user);
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const pending = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow;
      expect(calls).toBe(1);
      yield* TestClock.adjust("124 millis");
      expect(calls).toBe(1);
      yield* TestClock.adjust("1 millis");
      expect((yield* Fiber.join(pending)).username).toBe("rate-limit-test");
      expect(calls).toBe(2);
    }),
  );
});

test("429 retries stop after three retries", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      return response(request, 429, { message: "limited", retry_after: 0 });
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const result = yield* rest.getCurrentUser().pipe(Effect.flip);
      expect(result).toBeInstanceOf(DiscordApiError);
      expect(calls).toBe(4);
    }),
  );
});

test("interruption during HTTP frees the reservation", async () => {
  let calls = 0;
  const entered = await Effect.runPromise(Deferred.make<void>());
  const http = HttpClient.make((request) =>
    Effect.suspend(() => {
      calls++;
      return calls === 1
        ? Deferred.succeed(entered, undefined).pipe(Effect.andThen(Effect.never))
        : Effect.succeed(response(request, 200, user));
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const interrupted = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      yield* Deferred.await(entered);
      yield* Fiber.interrupt(interrupted);
      expect((yield* rest.getCurrentUser()).username).toBe("rate-limit-test");
      expect(calls).toBe(2);
    }),
  );
});
