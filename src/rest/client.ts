import { Context, Duration, Effect, Layer, Option, Redacted, Schedule } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { Request } from "./request";
import { Routes } from "./router";
import { User } from "@/model/user/user";
import { DiscordApiError, DiscordErrorBody } from "./error";
import { DiscordRateLimitCoordinator } from "./ratelimiter";
import { parseRateLimitHeaders } from "./ratelimiter/headers";
import type { RateLimitCoordinator } from "./ratelimiter/coordinator";

export const DISCORD_API_URL = "https://discord.com/api/v10";

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
      http.execute(prepared).pipe(
        Effect.flatMap((response) =>
          Effect.gen(function* () {
            const headers = parseRateLimitHeaders(response.headers);

            if (response.status === 429) {
              const body = yield* HttpClientResponse.schemaBodyJson(DiscordErrorBody)(
                response,
              ).pipe(
                Effect.orElseSucceed((): DiscordErrorBody => ({
                  message: "Discord returned an unrecognized rate limit response",
                })),
                Effect.onInterrupt(() =>
                  Option.isSome(permit)
                    ? coordinator.observe(permit.value, headers, response.status)
                    : Effect.void,
                ),
              );
              const observed = {
                ...headers,
                retryAfter: Option.orElse(headers.retryAfter, () =>
                  Option.map(Option.fromNullishOr(body.retryAfter), Duration.seconds),
                ),
                global: headers.global || body.global === true,
              };
              if (Option.isSome(permit)) {
                yield* Effect.uninterruptible(
                  coordinator.observe(permit.value, observed, response.status),
                );
              }
              return yield* new DiscordApiError({
                status: response.status,
                method: request.method,
                route: request.route._tag,
                body,
              });
            }

            if (Option.isSome(permit)) {
              yield* Effect.uninterruptible(
                coordinator.observe(permit.value, headers, response.status),
              );
            }
            return yield* HttpClientResponse.filterStatusOk(response);
          }),
        ),
      ),
    );

    return attempt.pipe(
      Effect.retry({
        schedule: Schedule.recurs(3),
        while: (error) => error instanceof DiscordApiError && error.status === 429,
      }),
    );
  };

  const getCurrentUser = () =>
    send(Request.make("GET", Routes.make("CurrentUser", {}))).pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(User)),
    );

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
