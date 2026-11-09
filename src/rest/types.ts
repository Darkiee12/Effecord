import { Array as Arr, Match, Option, Schema } from "effect";

export const HttpMethod = Schema.Literals(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export type HttpMethod = typeof HttpMethod.Type;

export const RateLimitKind = Schema.Literals(["None", "Path", "Major"]);

export type RateLimitKind = typeof RateLimitKind.Type;

export interface NoRateLimit {
  readonly _tag: "None";
}

export interface PathRateLimit {
  readonly _tag: "Path";
}

export interface MajorRateLimit<K extends string> {
  readonly _tag: "Major";
  readonly keys: readonly [K, ...K[]];
}

export type RateLimitRule<K extends string> = NoRateLimit | PathRateLimit | MajorRateLimit<K>;

export const RateLimit = {
  none: (): NoRateLimit => ({
    _tag: "None",
  }),

  path: (): PathRateLimit => ({
    _tag: "Path",
  }),

  major: <const K extends string>(...keys: readonly [K, ...K[]]): MajorRateLimit<K> => ({
    _tag: "Major",
    keys,
  }),
};

export type RouteParameter = string | number | bigint;

export type RouteParameters = Readonly<Record<string, RouteParameter>>;

type ParamsKeys<S extends Schema.Schema<RouteParameters>> = Extract<
  keyof Schema.Schema.Type<S>,
  string
>;

/**
 * Extract placeholders from a URL template.
 *
 * "/channels/{channelId}/messages/{messageId}"
 * -> "channelId" | "messageId"
 */
type PathKeys<P extends string> = P extends `${string}{${infer K}}${infer Rest}`
  ? K | PathKeys<Rest>
  : never;

/**
 * Ensure all URL placeholders are present in the
 * decoded parameter schema.
 */
type CheckedPath<S extends Schema.Schema<RouteParameters>, P extends string> =
  Exclude<PathKeys<P>, ParamsKeys<S>> extends never ? P : never;

export interface RouteDefinition<T extends RouteParameters = RouteParameters> {
  readonly params: Schema.Schema<T>;
  readonly path: string;
  readonly rateLimit: RateLimitRule<string>;
}

type ParamsOf<D extends RouteDefinition> = Schema.Schema.Type<D["params"]>;

export interface Route<Name extends string = string> {
  readonly _tag: Name;
  readonly path: string;
  readonly pattern: string;

  readonly rateLimit: {
    readonly kind: RateLimitKind;
    readonly major: Option.Option<readonly string[]>;
  };
}

/**
 * Interpolate already-typed route parameters.
 *
 * The parameter schema and path template are
 * checked when the route is defined.
 */
const renderPath = <T extends RouteParameters>(pattern: string, params: T): string =>
  pattern.replace(/\{([^{}]+)\}/g, (_, key: string) => encodeURIComponent(String(params[key])));

/**
 * Declare a route.
 *
 * The compiler verifies:
 * - Parameters are URL-compatible primitives.
 * - Every placeholder exists in the parameter schema.
 * - Rate-limit major keys exist in the path template.
 */
const define = <
  const S extends Schema.Schema<RouteParameters>,
  const P extends string,
>(definition: {
  readonly params: S;
  readonly path: P & CheckedPath<S, P>;
  readonly rateLimit: RateLimitRule<NoInfer<PathKeys<P>>>;
}) => definition;

/**
 * Construct a resolved route from typed parameters.
 */
const make = <const Name extends string, const D extends RouteDefinition>(
  name: Name,
  definition: D,
  params: NoInfer<ParamsOf<D>>,
): Route<Name> => {
  const rule = definition.rateLimit;

  const major: Option.Option<readonly string[]> = Match.valueTags(rule, {
    None: () => Option.none<readonly string[]>(),

    Path: () => Option.none<readonly string[]>(),

    Major: ({ keys }) => Option.some(Arr.map(keys, (key) => String(params[key]))),
  });

  return {
    _tag: name,
    path: renderPath(definition.path, params),
    pattern: definition.path,

    rateLimit: {
      kind: rule._tag,
      major,
    },
  };
};

/**
 * Create a typed registry of routes.
 *
 * Each route name retains its own parameter schema.
 */
const defineAll = <const D extends Readonly<Record<string, RouteDefinition>>>(definitions: D) => {
  const registry = Object.freeze(definitions);

  return {
    make<const Name extends Extract<keyof D, string>>(
      name: Name,
      params: NoInfer<ParamsOf<D[Name]>>,
    ): Route<Name> {
      const definition = registry[name];

      if (definition === undefined) {
        throw new Error(`Unknown route: ${name}`);
      }

      return make(name, definition, params);
    },
  };
};

export const Route = {
  define,
  make,
  defineAll,
};
