import { Schema } from "effect";

import * as Snowflake from "@/model/snowflake";

export const ChannelId = Snowflake.fromString.pipe(Schema.brand("ChannelId"));
export type ChannelId = typeof ChannelId.Type;
