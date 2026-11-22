import { Config, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { DiscordRest } from "../src/rest/client";

const program = Effect.gen(function* () {
  const token = yield* Config.Redacted("DISCORD_TOKEN");

  const Live = DiscordRest.layer(token).pipe(Layer.provide(FetchHttpClient.layer));

  const getCurrentUser = Effect.gen(function* () {
    const rest = yield* DiscordRest;
    return yield* rest.getCurrentUser();
  });

  const user = yield* getCurrentUser.pipe(Effect.provide(Live));

  yield* Effect.logInfo(`Authenticated as ${user.username} (${user.id})`);

  return user;
});

await Effect.runPromise(program);
