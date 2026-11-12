import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";

// https://docs.discord.com/developers/resources/audit-log#audit-log-entry-object
export const AuditLogEntryId = Snowflake.fromString.pipe(Schema.brand("AuditLogEntryId"));
export type AuditLogEntryId = typeof AuditLogEntryId.Type;

// https://docs.discord.com/developers/resources/guild#integration-object
export const IntegrationId = Snowflake.fromString.pipe(Schema.brand("IntegrationId"));
export type IntegrationId = typeof IntegrationId.Type;
