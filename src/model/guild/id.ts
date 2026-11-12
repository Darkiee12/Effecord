import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

export const GuildId = Snowflake.fromString.pipe(Schema.brand("GuildId"));
export type GuildId = typeof GuildId.Type;
