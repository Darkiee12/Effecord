import { expect, test } from "bun:test";
import { Deferred, Effect, Fiber, Layer, Option, Redacted, Schema } from "effect";
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http";
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

test("non-429 Discord errors decode into DiscordApiError without retrying and observe headers", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      return calls === 1
        ? response(
            request,
            403,
            {
              code: 50013,
              message: "Missing Permissions",
              errors: { _errors: [{ code: "MISSING", message: "Denied" }] },
            },
            {
              "x-ratelimit-limit": "1",
              "x-ratelimit-remaining": "0",
              "x-ratelimit-reset-after": "0.2",
            },
          )
        : response(request, 200, user);
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const error = yield* rest.getCurrentUser().pipe(Effect.flip);
      expect(error).toBeInstanceOf(DiscordApiError);
      if (error instanceof DiscordApiError) {
        expect(error.status).toBe(403);
        expect(error.method).toBe("GET");
        expect(error.route).toBe("CurrentUser");
        expect(error.body.code).toBe(50013);
        expect(error.body.message).toBe("Missing Permissions");
        expect(error.body.errors).toEqual({ _errors: [{ code: "MISSING", message: "Denied" }] });
      }
      expect(calls).toBe(1);

      // Rate-limit headers from the 403 were observed before returning the error.
      const next = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("199 millis");
      expect(calls).toBe(1);
      yield* TestClock.adjust("1 millis");
      expect((yield* Fiber.join(next)).username).toBe("rate-limit-test");
      expect(calls).toBe(2);
    }),
  );
});

test("malformed non-2xx and 429 bodies fall back cleanly", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      if (calls === 1) {
        return HttpClientResponse.fromWeb(
          request,
          new Response("<html>Bad Gateway</html>", {
            status: 502,
            headers: { "content-type": "text/html" },
          }),
        );
      }
      if (calls === 2) {
        return HttpClientResponse.fromWeb(
          request,
          new Response("not-json", {
            status: 429,
            headers: { "content-type": "text/plain", "retry-after": "0.1" },
          }),
        );
      }
      return response(request, 200, user);
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const gatewayError = yield* rest.getCurrentUser().pipe(Effect.flip);
      expect(gatewayError).toBeInstanceOf(DiscordApiError);
      if (gatewayError instanceof DiscordApiError) {
        expect(gatewayError.status).toBe(502);
        expect(gatewayError.body.message).toBe("Discord returned an unrecognized error response");
      }
      expect(calls).toBe(1);

      // Malformed 429 body still honors the Retry-After header and retries.
      const retried = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow;
      expect(calls).toBe(2);
      yield* TestClock.adjust("99 millis");
      expect(calls).toBe(2);
      yield* TestClock.adjust("1 millis");
      expect((yield* Fiber.join(retried)).username).toBe("rate-limit-test");
      expect(calls).toBe(3);
    }),
  );
});

test("429 waits for the longer of header Retry-After and fractional JSON retry_after", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      return calls === 1
        ? response(request, 429, { message: "limited", retry_after: 1.25 }, { "retry-after": "1" })
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
      yield* TestClock.adjust("1249 millis");
      expect(calls).toBe(1);
      yield* TestClock.adjust("1 millis");
      expect((yield* Fiber.join(pending)).username).toBe("rate-limit-test");
      expect(calls).toBe(2);
    }),
  );
});

test("transport failures and response decode errors stay distinct from DiscordApiError and do not retry", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.suspend(() => {
      calls++;
      if (calls === 1) {
        return Effect.fail(
          new HttpClientError.HttpClientError({
            reason: new HttpClientError.TransportError({
              request,
              description: "connection reset",
            }),
          }),
        );
      }
      if (calls === 2) {
        return Effect.succeed(response(request, 200, { invalid: true }));
      }
      return Effect.succeed(response(request, 200, user));
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;

      const transportError = yield* rest.getCurrentUser().pipe(Effect.flip);
      expect(HttpClientError.isHttpClientError(transportError)).toBe(true);
      expect(transportError).not.toBeInstanceOf(DiscordApiError);
      expect(calls).toBe(1);

      const decodeError = yield* rest.getCurrentUser().pipe(Effect.flip);
      expect(decodeError).toBeInstanceOf(Schema.SchemaError);
      expect(decodeError).not.toBeInstanceOf(DiscordApiError);
      expect(calls).toBe(2);

      // Both failures freed their permits cleanly.
      expect((yield* rest.getCurrentUser()).username).toBe("rate-limit-test");
      expect(calls).toBe(3);
    }),
  );
});

test("interruption while parsing a 429 body still observes headers and frees the permit", async () => {
  let calls = 0;
  const reading = await Effect.runPromise(Deferred.make<void>());
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      if (calls === 1) {
        const stalledBody = new ReadableStream<Uint8Array>({
          pull() {
            Effect.runFork(Deferred.succeed(reading, undefined));
            return new Promise<void>(() => {});
          },
        });
        return HttpClientResponse.fromWeb(
          request,
          new Response(stalledBody, {
            status: 429,
            headers: { "content-type": "application/json", "retry-after": "0.2" },
          }),
        );
      }
      return response(request, 200, user);
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const interrupted = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      yield* Deferred.await(reading);
      yield* Fiber.interrupt(interrupted);

      // Permit was freed, and the 429 Retry-After header still throttles the next request.
      const next = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("199 millis");
      expect(yield* Fiber.await(next).pipe(Effect.timeoutOption(0))).toEqual(Option.none());
      expect(calls).toBe(1);
      yield* TestClock.adjust("1 millis");
      expect((yield* Fiber.join(next)).username).toBe("rate-limit-test");
      expect(calls).toBe(2);
    }),
  );
});

test("multiple REST consumers share the coordinator global 429 deadline", async () => {
  let calls = 0;
  const http = HttpClient.make((request) =>
    Effect.sync(() => {
      calls++;
      return calls === 1
        ? response(request, 429, { message: "global limited", retry_after: 0.25, global: true })
        : response(request, 200, user);
    }),
  );

  await runRest(
    http,
    Effect.gen(function* () {
      const rest = yield* DiscordRest;
      const firstConsumer = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      for (let i = 0; i < 10; i++) yield* Effect.yieldNow;
      expect(calls).toBe(1);

      const secondConsumer = yield* rest.getCurrentUser().pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      yield* TestClock.adjust("249 millis");
      expect(calls).toBe(1);

      yield* TestClock.adjust("1 millis");
      const [firstUser, secondUser] = yield* Effect.all([
        Fiber.join(firstConsumer),
        Fiber.join(secondConsumer),
      ]);
      expect(firstUser.username).toBe("rate-limit-test");
      expect(secondUser.username).toBe("rate-limit-test");
      expect(calls).toBe(3);
    }),
  );
});
