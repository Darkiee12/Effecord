import * as Snowflake from "@/model/snowflake";
import { Schema } from "effect";

export const GuildId = Snowflake.fromString.pipe(Schema.brand("GuildId"));
export type GuildId = typeof GuildId.Type;
