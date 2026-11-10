import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { UserId } from "@/model/user";

export const RoleTags = Schema.Struct({
  botId: Schema.optionalKey(UserId),
  integrationId: Schema.optionalKey(Snowflake.fromString),
  premiumSubscriber: Schema.optionalKey(Schema.Null),
  subscriptionListingId: Schema.optionalKey(Snowflake.fromString),
  availableForPurchase: Schema.optionalKey(Schema.Null),
  guildConnections: Schema.optionalKey(Schema.Null),
}).pipe(
  Schema.encodeKeys({
    botId: "bot_id",
    integrationId: "integration_id",
    premiumSubscriber: "premium_subscriber",
    subscriptionListingId: "subscription_listing_id",
    availableForPurchase: "available_for_purchase",
    guildConnections: "guild_connections",
  }),
);
export type RoleTags = typeof RoleTags.Type;
