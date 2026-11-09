import * as Snowflake from "@/model/snowflake";
import { Schema } from "effect";

export const MessageId = Snowflake.fromString.pipe(Schema.brand("MessageId"));
export type MessageId = typeof MessageId.Type;
