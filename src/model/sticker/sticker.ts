import { Schema } from "effect";

import { GuildId } from "@/model/guild/id";
import * as Snowflake from "@/model/snowflake";
import { User } from "@/model/user/user";

import { StickerId, StickerPackId, StickerPackSkuId } from "./id";

// https://docs.discord.com/developers/resources/sticker#sticker-object
export const StickerType = Schema.Enum({
  Standard: 1,
  Guild: 2,
});
export type StickerType = typeof StickerType.Type;

export const StickerFormatType = Schema.Enum({
  PNG: 1,
  APNG: 2,
  Lottie: 3,
  GIF: 4,
});
export type StickerFormatType = typeof StickerFormatType.Type;

const stickerKeys = {
  packId: "pack_id",
  formatType: "format_type",
  guildId: "guild_id",
  sortValue: "sort_value",
} as const;

// `description` is a required key that may be null; `pack_id`, `available`,
// `guild_id`, `user`, and `sort_value` are optional and omitted when absent.
export const Sticker = Schema.Struct({
  id: StickerId,
  packId: Schema.optionalKey(StickerPackId),
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  tags: Schema.String,
  type: StickerType,
  formatType: StickerFormatType,
  available: Schema.optionalKey(Schema.Boolean),
  guildId: Schema.optionalKey(GuildId),
  user: Schema.optionalKey(User),
  sortValue: Schema.optionalKey(Schema.Int),
}).pipe(Schema.encodeKeys(stickerKeys));
export type Sticker = typeof Sticker.Type;

// Minimal sticker object sent inside messages (`sticker_items`).
export const StickerItem = Schema.Struct({
  id: StickerId,
  name: Schema.String,
  formatType: StickerFormatType,
}).pipe(
  Schema.encodeKeys({
    formatType: "format_type",
  }),
);
export type StickerItem = typeof StickerItem.Type;

export const StickerPack = Schema.Struct({
  id: StickerPackId,
  stickers: Schema.Array(Sticker),
  name: Schema.String,
  skuId: StickerPackSkuId,
  coverStickerId: Schema.optionalKey(StickerId),
  description: Schema.String,
  bannerAssetId: Schema.optionalKey(Snowflake.fromString),
}).pipe(
  Schema.encodeKeys({
    skuId: "sku_id",
    coverStickerId: "cover_sticker_id",
    bannerAssetId: "banner_asset_id",
  }),
);
export type StickerPack = typeof StickerPack.Type;
