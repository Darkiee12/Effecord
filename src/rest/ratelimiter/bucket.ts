
import { Clock, Duration, Effect, Option, Ref, Semaphore } from "effect";
import type { RateLimitHeaders } from "./headers";

export interface RateLimitWindow {
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;
}

export const make = Effect.gen(function* () {
  const state = yield* Ref.make<Option.Option<RateLimitWindow>>(Option.none());
  const semaphore = yield* Semaphore.make(1);

  const reserve = Effect.gen(function* () {
    while (true) {
      const now = yield* Clock.currentTimeMillis;

      const delay = yield* Ref.modify(state, (current) =>
        Option.match(current, {
          onNone: () => [0, current] as const,
          onSome: (window) => {
            if (now >= window.resetAt) {
              return [0, Option.none<RateLimitWindow>()] as const;
            }

            if (window.remaining === 0) {
              return [window.resetAt - now, current] as const;
            }

            return [
              0,
              Option.some({
                ...window,
                remaining: window.remaining - 1,
              }),
            ] as const;
          },
        }),
      );

      if (delay === 0) return;

      yield* Effect.sleep(Duration.millis(delay));
    }
  });

  const observe = (headers: RateLimitHeaders) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;

      const resetAt = Option.orElse(
        Option.map(
          headers.resetAfter,
          (duration) => now + Duration.toMillis(duration),
        ),
        () => headers.resetAt,
      );

      const next = Option.gen(function* () {
        const limit = yield* headers.limit;
        const remaining = yield* headers.remaining;
        const deadline = yield* resetAt;

        return {
          limit,
          remaining,
          resetAt: deadline,
        };
      });

      if (Option.isSome(next)) {
        yield* Ref.set(state, next);
      }
    });

  return {
    reserve,
    observe,
    withPermit: semaphore.withPermits(1),
    snapshot: Ref.get(state),
  };
});

export type Bucket = Effect.Success<typeof make>;
