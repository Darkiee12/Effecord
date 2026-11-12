import { Context, Layer } from "effect";

import { make, type RateLimitCoordinator } from "./coordinator";

export class DiscordRateLimitCoordinator extends Context.Service<
  DiscordRateLimitCoordinator,
  RateLimitCoordinator
>()("effecord/DiscordRateLimitCoordinator") {
  static readonly layer = Layer.effect(
    DiscordRateLimitCoordinator,
    make,
  );
}

export * as Coordinator from "./coordinator";
export * as Headers from "./headers"