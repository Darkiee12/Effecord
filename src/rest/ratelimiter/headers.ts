// oxlint-disable effecttsgo/unstable-api-usage
import { Duration, Option, Schema } from "effect";
import { Headers } from "effect/http";
import { decodeInteger, decodeNumber } from "@/util/num";

export const RateLimitScope = Schema.Literals(["user", "global", "shared"]);
export type RateLimitScope = typeof RateLimitScope.Type;

export interface RateLimitHeaders {
  readonly bucket: Option.Option<string>;
  readonly limit: Option.Option<number>;
  readonly remaining: Option.Option<number>;
  readonly resetAt: Option.Option<number>;
  readonly resetAfter: Option.Option<Duration.Duration>;
  readonly retryAfter: Option.Option<Duration.Duration>;
  readonly scope: Option.Option<RateLimitScope>;
  readonly global: boolean;
}

const decodeScope = Schema.decodeUnknownOption(RateLimitScope);

export const parseRateLimitHeaders = (headers: Headers.Headers): RateLimitHeaders => {
  const get = (name: string) => Headers.get(headers, name);

  const read = <A>(name: string, decode: (value: string) => Option.Option<A>): Option.Option<A> =>
    Option.flatMap(get(name), decode);

  const scope = read("x-ratelimit-scope", decodeScope);

  return {
    bucket: get("x-ratelimit-bucket").pipe(
      Option.map((value) => value.trim()),
      Option.filter((value) => value.length > 0),
    ),

    limit: read("x-ratelimit-limit", decodeInteger),
    remaining: read("x-ratelimit-remaining", decodeInteger),

    resetAt: read("x-ratelimit-reset", decodeNumber).pipe(Option.map((seconds) => seconds * 1_000)),

    resetAfter: read("x-ratelimit-reset-after", decodeNumber).pipe(Option.map(Duration.seconds)),

    retryAfter: read("retry-after", decodeNumber).pipe(Option.map(Duration.seconds)),

    scope,

    global:
      get("x-ratelimit-global").pipe(
        Option.map((value) => value.trim().toLowerCase() === "true"),
        Option.getOrElse(() => false),
      ) ||
      (Option.isSome(scope) && scope.value === "global"),
  };
};
