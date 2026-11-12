import { Schema } from "effect";

import * as Snowflake from "@/model/snowflake";

export const StickerId = Snowflake.fromString.pipe(Schema.brand("StickerId"));
export type StickerId = typeof StickerId.Type;

export const StickerPackId = Snowflake.fromString.pipe(Schema.brand("StickerPackId"));
export type StickerPackId = typeof StickerPackId.Type;

export const StickerPackSkuId = Snowflake.fromString.pipe(Schema.brand("StickerPackSkuId"));
export type StickerPackSkuId = typeof StickerPackSkuId.Type;
