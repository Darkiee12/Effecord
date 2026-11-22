// oxlint-disable effecttsgo/unstable-api-usage
import { Effect, Schema } from "effect";
import { HttpClientResponse } from "effect/http";
import type { Request } from "./request";
import { HttpMethod } from "./types";

export const DiscordErrorBody = Schema.Struct({
  code: Schema.optionalKey(Schema.Int),
  message: Schema.String,
  errors: Schema.optionalKey(Schema.Unknown),
  retryAfter: Schema.optionalKey(Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))),
  global: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    retryAfter: "retry_after",
  }),
);

export type DiscordErrorBody = typeof DiscordErrorBody.Type;

export class DiscordApiError extends Schema.TaggedError<
  DiscordApiError,
  { readonly brand: unique symbol }
>()("DiscordApiError", {
  status: Schema.Int,
  method: HttpMethod,
  route: Schema.String,
  body: DiscordErrorBody,
}) {}

export const decodeErrorBody = (
  response: HttpClientResponse.HttpClientResponse,
  fallbackMessage = "Discord returned an unrecognized error response",
): Effect.Effect<DiscordErrorBody> =>
  HttpClientResponse.schemaBodyJson(DiscordErrorBody)(response).pipe(
    Effect.orElseSucceed((): DiscordErrorBody => ({
      message: fallbackMessage,
    })),
  );

export const apiError = (
  request: Request,
  response: HttpClientResponse.HttpClientResponse,
  body: DiscordErrorBody,
): DiscordApiError =>
  new DiscordApiError({
    status: response.status,
    method: request.method,
    route: request.route._tag,
    body,
  });

export const failFromResponse = (
  request: Request,
  response: HttpClientResponse.HttpClientResponse,
) =>
  decodeErrorBody(response).pipe(
    Effect.flatMap((body) => Effect.fail(apiError(request, response, body))),
  );
