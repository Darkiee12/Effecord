import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

export const WebhookId = Snowflake.fromString.pipe(Schema.brand("WebhookId"));
export type WebhookId = typeof WebhookId.Type;
