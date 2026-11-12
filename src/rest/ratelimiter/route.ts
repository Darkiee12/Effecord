
import { Match, Option } from "effect";
import type { HttpMethod, Route } from "../types";

const majorKey = (route: Route): readonly string[] =>
  Option.getOrElse(route.rateLimit.major, () => []);

export const routeKey = (
  method: HttpMethod,
  route: Route,
): string => JSON.stringify([method, route.pattern]);

export const provisionalKey = (
  method: HttpMethod,
  route: Route,
): Option.Option<string> =>
  Match.value(route.rateLimit.kind).pipe(
    Match.when("None", () => Option.none<string>()),
    Match.when("Path", () =>
      Option.some(JSON.stringify(["provisional", method, route.pattern])),
    ),
    Match.when("Major", () =>
      Option.some(JSON.stringify([
        "provisional",
        method,
        route.pattern,
        majorKey(route),
      ])),
    ),
    Match.exhaustive,
  );

export const discoveredKey = (
  route: Route,
  bucketHash: string,
): string =>
  JSON.stringify([
    "discovered",
    bucketHash,
    majorKey(route),
  ]);
