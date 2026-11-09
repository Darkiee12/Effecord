import { Effect, Schema } from "effect";
import { Headers, HttpClientRequest, UrlParams } from "effect/http";

import type { HttpMethod, Route } from "./types";

/**
 * Discord-aware HTTP request.
 *
 * Keeps route metadata alongside Effect's
 * immutable HttpClientRequest.
 */
export interface Request<Name extends string = string> {
  readonly method: HttpMethod;
  readonly route: Route<Name>;
  readonly http: HttpClientRequest.HttpClientRequest;
}

/**
 * Apply an HTTP transformation while preserving
 * the route's type and rate-limit metadata.
 */
const mapHttp = <Name extends string>(
  request: Request<Name>,
  transform: (http: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest,
): Request<Name> => ({
  ...request,
  http: transform(request.http),
});

const make = <const Name extends string>(
  method: HttpMethod,
  route: Route<Name>,
): Request<Name> => ({
  method,
  route,
  http: HttpClientRequest.make(method)(route.path),
});

/**
 * Set request headers.
 */
const headers = <Name extends string>(
  request: Request<Name>,
  input: Headers.Input,
): Request<Name> => mapHttp(request, HttpClientRequest.setHeaders(input));

/**
 * Set URL query parameters.
 */
const query = <Name extends string>(
  request: Request<Name>,
  input: UrlParams.Input,
): Request<Name> => mapHttp(request, HttpClientRequest.setUrlParams(input));

/**
 * Encode a request body using an Effect Schema.
 *
 * Returns Effect because encoding can fail.
 */
const json = <Name extends string, S extends Schema.Constraint>(
  request: Request<Name>,
  schema: S,
  body: NoInfer<S["Type"]>,
) =>
  HttpClientRequest.schemaBodyJson(schema)(request.http, body).pipe(
    Effect.map((http): Request<Name> => ({
      ...request,
      http,
    })),
  );

/**
 * Attach a multipart/form-data body.
 */
const multipart = <Name extends string>(request: Request<Name>, body: FormData): Request<Name> =>
  mapHttp(request, HttpClientRequest.bodyFormData(body));

export const Request = {
  make,
  headers,
  query,
  json,
  multipart,
};
