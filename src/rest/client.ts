import { Context, Effect, Layer, Redacted } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { Request } from "./request";
import { Routes } from "./router";
import { User } from "@/model/user/user";

export const DISCORD_API_URL = "https://discord.com/api/v10";

/**
 * Constructs the Discord REST implementation.
 *
 * Dependencies are injected once through the Layer.
 */
const makeClient = (http: HttpClient.HttpClient, token: Redacted.Redacted<string>) => {
  /**
   * Shared HTTP execution pipeline.
   *
   * Rate limiting, retries and request tracing
   * will be integrated here.
   */
  const send = (request: Request) => {
    const prepared = request.http.pipe(
      HttpClientRequest.prependUrl(DISCORD_API_URL),
      HttpClientRequest.acceptJson,
      HttpClientRequest.setHeader("Authorization", `Bot ${Redacted.value(token)}`),
    );

    return http.execute(prepared).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
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
      Effect.map(HttpClient.HttpClient, (http) => makeClient(http, token)),
    );
}
