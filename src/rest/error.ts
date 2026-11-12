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

export const failFromResponse = (
  request: Request,
  response: HttpClientResponse.HttpClientResponse,
) =>
  HttpClientResponse.schemaBodyJson(DiscordErrorBody)(response).pipe(
    Effect.orElseSucceed(() => ({
      message: "Discord returned an unrecognized error response",
    })),
    Effect.flatMap((body) =>
      Effect.fail(
        new DiscordApiError({
          status: response.status,
          method: request.method,
          route: request.route._tag,
          body,
        }),
      ),
    ),
  );
