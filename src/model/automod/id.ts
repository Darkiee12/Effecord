import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

export const AutoModerationRuleId = Snowflake.fromString.pipe(Schema.brand("AutoModerationRuleId"));
export type AutoModerationRuleId = typeof AutoModerationRuleId.Type;
