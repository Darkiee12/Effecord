import * as Snowflake from "@/model/snowflake";
import { Schema } from "effect";

export const RoleId = Snowflake.fromString.pipe(Schema.brand("RoleId"));
export type RoleId = typeof RoleId.Type;
