import { Schema } from "effect";
import { ChannelId } from "@/model/channel/channel";
import { MessageId } from "@/model/channel/message";
import { UserId } from "@/model/user/user";
import { ApplicationId } from "@/model/application/application";
import { IntegrationId, AuditLogEntryId } from "./id";
import { AuditLogEvent } from "./event";

// Change values mirror the changed object's field types, which vary per
// event. Schema.Unknown is deliberate here: the payload is heterogeneous by
// design and docs warn apps must not depend on a single pattern.
export const AuditLogChange = Schema.Struct({
  key: Schema.String,
  newValue: Schema.optionalKey(Schema.Unknown),
  oldValue: Schema.optionalKey(Schema.Unknown),
}).pipe(
  Schema.encodeKeys({
    newValue: "new_value",
    oldValue: "old_value",
  }),
);
export type AuditLogChange = typeof AuditLogChange.Type;

// https://docs.discord.com/developers/resources/audit-log#audit-log-entry-object-optional-audit-entry-info
// Counts and overwrite descriptors are strings on the wire, not numbers.
export const OptionalAuditEntryInfo = Schema.Struct({
  applicationId: Schema.optionalKey(ApplicationId),
  autoModerationRuleName: Schema.optionalKey(Schema.String),
  autoModerationRuleTriggerType: Schema.optionalKey(Schema.String),
  channelId: Schema.optionalKey(ChannelId),
  count: Schema.optionalKey(Schema.String),
  deleteMemberDays: Schema.optionalKey(Schema.String),
  id: Schema.optionalKey(Schema.String),
  membersRemoved: Schema.optionalKey(Schema.String),
  messageId: Schema.optionalKey(MessageId),
  roleName: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(Schema.String),
  integrationType: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    applicationId: "application_id",
    autoModerationRuleName: "auto_moderation_rule_name",
    autoModerationRuleTriggerType: "auto_moderation_rule_trigger_type",
    channelId: "channel_id",
    deleteMemberDays: "delete_member_days",
    membersRemoved: "members_removed",
    messageId: "message_id",
    roleName: "role_name",
    integrationType: "integration_type",
  }),
);
export type OptionalAuditEntryInfo = typeof OptionalAuditEntryInfo.Type;

// https://docs.discord.com/developers/resources/audit-log#audit-log-entry-object
export const AuditLogEntry = Schema.Struct({
  targetId: Schema.NullOr(Schema.String),
  changes: Schema.optionalKey(Schema.Array(AuditLogChange)),
  userId: Schema.NullOr(UserId),
  id: AuditLogEntryId,
  actionType: AuditLogEvent,
  options: Schema.optionalKey(OptionalAuditEntryInfo),
  reason: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    targetId: "target_id",
    userId: "user_id",
    actionType: "action_type",
  }),
);
export type AuditLogEntry = typeof AuditLogEntry.Type;

// Minimal partial integration: the full integration object is not owned by
// this module. Present in the example payload verbatim.
export const PartialIntegration = Schema.Struct({
  id: IntegrationId,
  name: Schema.String,
  type: Schema.String,
  account: Schema.Struct({
    name: Schema.String,
    id: Schema.String,
  }),
  applicationId: Schema.optionalKey(ApplicationId),
}).pipe(
  Schema.encodeKeys({
    applicationId: "application_id",
  }),
);
export type PartialIntegration = typeof PartialIntegration.Type;

// https://docs.discord.com/developers/resources/audit-log#audit-log-object
// Referenced collections (application commands, users, webhooks, threads,
// scheduled events, auto moderation rules) are owned by other modules or are
// transport-adjacent, so they decode as Unknown here. Only entries and the
// partial integration shape above are typed.
export const AuditLog = Schema.Struct({
  applicationCommands: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  auditLogEntries: Schema.Array(AuditLogEntry),
  autoModerationRules: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  guildScheduledEvents: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  integrations: Schema.optionalKey(Schema.Array(PartialIntegration)),
  threads: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  users: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  webhooks: Schema.optionalKey(Schema.Array(Schema.Unknown)),
}).pipe(
  Schema.encodeKeys({
    applicationCommands: "application_commands",
    auditLogEntries: "audit_log_entries",
    autoModerationRules: "auto_moderation_rules",
    guildScheduledEvents: "guild_scheduled_events",
    integrations: "integrations",
    threads: "threads",
    users: "users",
    webhooks: "webhooks",
  }),
);
export type AuditLog = typeof AuditLog.Type;
