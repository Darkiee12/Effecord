import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

export const EntitlementId = Snowflake.fromString.pipe(Schema.brand("EntitlementId"));
export type EntitlementId = typeof EntitlementId.Type;
