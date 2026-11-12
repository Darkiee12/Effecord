import { Schema } from "effect";

import * as Snowflake from "@/model/snowflake";

export const EmojiId = Snowflake.fromString.pipe(Schema.brand("EmojiId"));
export type EmojiId = typeof EmojiId.Type;
