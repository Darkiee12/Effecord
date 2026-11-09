import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { UserFlags } from "./flags";
import { PremiumType } from "./premium-type";

export const UserId = Snowflake.fromString.pipe(Schema.brand("UserId"));
export type UserId = typeof UserId.Type;

export const SkuId = Snowflake.fromString.pipe(Schema.brand("SkuId"));
export type SkuId = typeof SkuId.Type;

export const AvatarDecorationData = Schema.Struct({
  asset: Schema.String,
  skuId: SkuId,
}).pipe(
  Schema.encodeKeys({
    skuId: "sku_id",
  }),
);
export type AvatarDecorationData = typeof AvatarDecorationData.Type;

export const NameplateColor = Schema.Literals([
  "crimson",
  "berry",
  "sky",
  "teal",
  "forest",
  "bubble_gum",
  "violet",
  "cobalt",
  "clover",
  "lemon",
  "white",
]);
export type NameplateColor = typeof NameplateColor.Type;

export const Nameplate = Schema.Struct({
  skuId: SkuId,
  asset: Schema.String,
  label: Schema.String,
  palette: NameplateColor,
}).pipe(
  Schema.encodeKeys({
    skuId: "sku_id",
  }),
);
export type Nameplate = typeof Nameplate.Type;

export const Collectibles = Schema.Struct({
  nameplate: Schema.optionalKey(Nameplate),
});
export type Collectibles = typeof Collectibles.Type;

export const PrimaryGuild = Schema.Struct({
  identityGuildId: Schema.NullOr(Snowflake.fromString),
  identityEnabled: Schema.NullOr(Schema.Boolean),
  tag: Schema.NullOr(Schema.String),
  badge: Schema.NullOr(Schema.String),
}).pipe(
  Schema.encodeKeys({
    identityGuildId: "identity_guild_id",
    identityEnabled: "identity_enabled",
  }),
);
export type PrimaryGuild = typeof PrimaryGuild.Type;

export const User = Schema.Struct({
  id: UserId,
  username: Schema.String,
  discriminator: Schema.String,
  globalName: Schema.NullOr(Schema.String),
  avatar: Schema.NullOr(Schema.String),
  bot: Schema.optionalKey(Schema.Boolean),
  system: Schema.optionalKey(Schema.Boolean),
  mfaEnabled: Schema.optionalKey(Schema.Boolean),
  banner: Schema.optionalKey(Schema.NullOr(Schema.String)),
  accentColor: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  locale: Schema.optionalKey(Schema.String),
  verified: Schema.optionalKey(Schema.Boolean),
  email: Schema.optionalKey(Schema.NullOr(Schema.String)),
  flags: Schema.optionalKey(UserFlags),
  premiumType: Schema.optionalKey(PremiumType),
  publicFlags: Schema.optionalKey(UserFlags),
  avatarDecorationData: Schema.optionalKey(Schema.NullOr(AvatarDecorationData)),
  collectibles: Schema.optionalKey(Schema.NullOr(Collectibles)),
  primaryGuild: Schema.optionalKey(Schema.NullOr(PrimaryGuild)),
}).pipe(
  Schema.encodeKeys({
    globalName: "global_name",
    mfaEnabled: "mfa_enabled",
    accentColor: "accent_color",
    premiumType: "premium_type",
    publicFlags: "public_flags",
    avatarDecorationData: "avatar_decoration_data",
    primaryGuild: "primary_guild",
  }),
);
export type User = typeof User.Type;
