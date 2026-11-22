import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

export const StageInstanceId = Snowflake.fromString.pipe(Schema.brand("StageInstanceId"));
export type StageInstanceId = typeof StageInstanceId.Type;
