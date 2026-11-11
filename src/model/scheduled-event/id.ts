import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

export const ScheduledEventId = Snowflake.fromString.pipe(Schema.brand("ScheduledEventId"));
export type ScheduledEventId = typeof ScheduledEventId.Type;
