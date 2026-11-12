import { HashMap } from "effect";
import * as BitSet from "@/util/bitset";

import { Schema } from "effect";
import { ApplicationId } from "@/model/application/application";
// SkuId lives in the user module for now (collectibles/avatar decorations);
// reused here via import, never redefined.
// TODO: relocate SkuId to the entitlement/sku module once dependents migrate.
import { SkuId } from "@/model/user/user";

// https://docs.discord.com/developers/resources/sku#sku-object-sku-types
// Only documented values are modeled. SUBSCRIPTION_GROUP (6) is
// system-generated per SUBSCRIPTION and not used directly.
export const SkuType = Schema.Enum({
  Durable: 2,
  Consumable: 3,
  Subscription: 5,
  SubscriptionGroup: 6,
});
export type SkuType = typeof SkuType.Type;

// https://docs.discord.com/developers/resources/sku#sku-object-sku-flags
export const SkuFlag = HashMap.fromIterable([
  ["Available", 1 << 2],
  ["GuildSubscription", 1 << 7],
  ["UserSubscription", 1 << 8],
] as const);
export type SkuFlag = HashMap.HashMap.Key<typeof SkuFlag>;

const sku = BitSet.make("SkuBitSet", SkuFlag);

export const SkuBitSet = sku.BitSet;
export type SkuBitSet = InstanceType<typeof SkuBitSet>;

export const SkuFlags = sku.fromNumber;
export type SkuFlags = typeof SkuFlags.Type;

// https://docs.discord.com/developers/resources/sku#sku-object
export const Sku = Schema.Struct({
  id: SkuId,
  type: SkuType,
  applicationId: ApplicationId,
  name: Schema.String,
  slug: Schema.String,
  flags: SkuFlags,
}).pipe(
  Schema.encodeKeys({
    applicationId: "application_id",
  }),
);
export type Sku = typeof Sku.Type;
