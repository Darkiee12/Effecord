import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { UserId, SkuId } from "@/model/user/user";
import { ApplicationId } from "@/model/application/application";
import { EntitlementId } from "./id";

// https://docs.discord.com/developers/resources/entitlement#entitlement-object-entitlement-types
export const EntitlementType = Schema.Enum({
  Purchase: 1,
  PremiumSubscription: 2,
  DeveloperGift: 3,
  TestModePurchase: 4,
  FreePurchase: 5,
  UserGift: 6,
  PremiumPurchase: 7,
  ApplicationSubscription: 8,
});
export type EntitlementType = typeof EntitlementType.Type;

// https://docs.discord.com/developers/resources/entitlement#entitlement-object
// `promotion_id`, `gift_code_flags`, and `subscription_id` appear in examples
// but not in the documented structure table: deferred explicitly, not modeled.
// There is no separate Subscription object in current docs: deferred.
export const Entitlement = Schema.Struct({
  id: EntitlementId,
  skuId: SkuId,
  applicationId: ApplicationId,
  userId: Schema.optionalKey(UserId),
  type: EntitlementType,
  deleted: Schema.Boolean,
  startsAt: Schema.NullOr(Schema.DateTimeUtcFromString),
  endsAt: Schema.NullOr(Schema.DateTimeUtcFromString),
  guildId: Schema.optionalKey(GuildId),
  consumed: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    skuId: "sku_id",
    applicationId: "application_id",
    userId: "user_id",
    startsAt: "starts_at",
    endsAt: "ends_at",
    guildId: "guild_id",
  }),
);
export type Entitlement = typeof Entitlement.Type;
