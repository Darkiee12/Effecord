import { Context, Duration, Effect, Layer, Option, Redacted, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { Request } from "./request";
import { Routes } from "./router";
import { User } from "@/model/user/user";
import { DiscordApiError, apiError, decodeErrorBody, failFromResponse } from "./error";
import { DiscordRateLimitCoordinator } from "./ratelimiter";
import { parseRateLimitHeaders } from "./ratelimiter/headers";
import type { RateLimitCoordinator } from "./ratelimiter/coordinator";

export const DISCORD_API_URL = "https://discord.com/api/v10";

const maxDuration = (
  first: Option.Option<Duration.Duration>,
  second: Option.Option<Duration.Duration>,
): Option.Option<Duration.Duration> =>
  Option.match(first, {
    onNone: () => second,
    onSome: (a) =>
      Option.some(
        Option.match(second, {
          onNone: () => a,
          onSome: (b) => Duration.max(a, b),
        }),
      ),
  });

/**
 * Constructs the Discord REST implementation.
 *
 * Dependencies are injected once through the Layer.
 */
const makeClient = (
  http: HttpClient.HttpClient,
  token: Redacted.Redacted<string>,
  coordinator: RateLimitCoordinator,
) => {
  /**
   * Shared HTTP execution pipeline.
   *
   * Each retry acquires a fresh reservation. The actor never runs HTTP.
   */
  const send = (request: Request) => {
    const prepared = request.http.pipe(
      HttpClientRequest.prependUrl(DISCORD_API_URL),
      HttpClientRequest.acceptJson,
      HttpClientRequest.setHeader("Authorization", `Bot ${Redacted.value(token)}`),
    );

    const attempt = coordinator.withPermit(request.method, request.route, (permit) =>
      Effect.uninterruptibleMask((restore) =>
        Effect.gen(function* () {
          const response = yield* restore(http.execute(prepared));
          const headers = parseRateLimitHeaders(response.headers);

          if (response.status === 429) {
            const body = yield* restore(
              decodeErrorBody(response, "Discord returned an unrecognized rate limit response"),
            ).pipe(
              Effect.onInterrupt(() =>
                Option.isSome(permit)
                  ? coordinator.observe(permit.value, headers, response.status)
                  : Effect.void,
              ),
            );
            const observed = {
              ...headers,
              retryAfter: maxDuration(
                headers.retryAfter,
                Option.map(Option.fromNullishOr(body.retryAfter), Duration.seconds),
              ),
              global: headers.global || body.global === true,
            };
            if (Option.isSome(permit)) {
              yield* coordinator.observe(permit.value, observed, response.status);
            }
            return yield* apiError(request, response, body);
          }

          if (Option.isSome(permit)) {
            yield* coordinator.observe(permit.value, headers, response.status);
          }

          if (response.status < 200 || response.status >= 300) {
            return yield* restore(failFromResponse(request, response));
          }

          return response;
        }),
      ),
    );

    return attempt.pipe(
      Effect.retry({
        schedule: Schedule.recurs(3),
        while: (error) => error instanceof DiscordApiError && error.status === 429,
      }),
    );
  };

  const sendJson = <S extends Schema.Constraint>(request: Request, schema: S) =>
    send(request).pipe(Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)));

  const getCurrentUser = () => sendJson(Request.make("GET", Routes.make("CurrentUser", {})), User);

  return {
    getCurrentUser,
  };
};

/**
 * Centralized Discord REST service.
 *
 * The service type is inferred from makeClient,
 * avoiding a duplicated interface.
 */
export class DiscordRest extends Context.Service<DiscordRest, ReturnType<typeof makeClient>>()(
  "effecord/DiscordRest",
) {
  static layer = (token: Redacted.Redacted<string>) =>
    Layer.effect(
      DiscordRest,
      Effect.gen(function* () {
        const http = yield* HttpClient.HttpClient;
        const coordinator = yield* DiscordRateLimitCoordinator;
        return makeClient(http, token, coordinator);
      }),
    ).pipe(Layer.provide(DiscordRateLimitCoordinator.layer));
}
