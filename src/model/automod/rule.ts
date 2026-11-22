import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { ChannelId } from "@/model/channel/channel";
import { RoleId } from "@/model/role/id";
import { UserId } from "@/model/user/user";
import { AutoModerationRuleId } from "./id";

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-rule-object-event-types
export const AutoModerationEventType = Schema.Enum({
  MessageSend: 1,
  MemberUpdate: 2,
});
export type AutoModerationEventType = typeof AutoModerationEventType.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-rule-object-trigger-types
// NOTE: value 2 is unused by Discord; only documented values are modeled.
export const AutoModerationTriggerType = Schema.Enum({
  Keyword: 1,
  Spam: 3,
  KeywordPreset: 4,
  MentionSpam: 5,
  MemberProfile: 6,
});
export type AutoModerationTriggerType = typeof AutoModerationTriggerType.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-rule-object-keyword-preset-types
export const KeywordPresetType = Schema.Enum({
  Profanity: 1,
  SexualContent: 2,
  Slurs: 3,
});
export type KeywordPresetType = typeof KeywordPresetType.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-action-object-action-types
export const AutoModerationActionType = Schema.Enum({
  BlockMessage: 1,
  SendAlertMessage: 2,
  Timeout: 3,
  BlockMemberInteraction: 4,
});
export type AutoModerationActionType = typeof AutoModerationActionType.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-action-object-action-metadata
export const AutoModerationActionMetadata = Schema.Struct({
  channelId: Schema.optionalKey(ChannelId),
  durationSeconds: Schema.optionalKey(Schema.Int),
  customMessage: Schema.optionalKey(Schema.NullOr(Schema.String)),
}).pipe(
  Schema.encodeKeys({
    channelId: "channel_id",
    durationSeconds: "duration_seconds",
    customMessage: "custom_message",
  }),
);
export type AutoModerationActionMetadata = typeof AutoModerationActionMetadata.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-action-object
export const AutoModerationAction = Schema.Struct({
  type: AutoModerationActionType,
  metadata: Schema.optionalKey(AutoModerationActionMetadata),
});
export type AutoModerationAction = typeof AutoModerationAction.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-rule-object-trigger-metadata
export const AutoModerationTriggerMetadata = Schema.Struct({
  keywordFilter: Schema.optionalKey(Schema.Array(Schema.String)),
  regexPatterns: Schema.optionalKey(Schema.Array(Schema.String)),
  presets: Schema.optionalKey(Schema.Array(KeywordPresetType)),
  allowList: Schema.optionalKey(Schema.Array(Schema.String)),
  mentionTotalLimit: Schema.optionalKey(Schema.Int),
  mentionRaidProtectionEnabled: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    keywordFilter: "keyword_filter",
    regexPatterns: "regex_patterns",
    allowList: "allow_list",
    mentionTotalLimit: "mention_total_limit",
    mentionRaidProtectionEnabled: "mention_raid_protection_enabled",
  }),
);
export type AutoModerationTriggerMetadata = typeof AutoModerationTriggerMetadata.Type;

// https://docs.discord.com/developers/resources/auto-moderation#auto-moderation-rule-object
export const AutoModerationRule = Schema.Struct({
  id: AutoModerationRuleId,
  guildId: GuildId,
  name: Schema.String,
  creatorId: UserId,
  eventType: AutoModerationEventType,
  triggerType: AutoModerationTriggerType,
  triggerMetadata: AutoModerationTriggerMetadata,
  actions: Schema.Array(AutoModerationAction),
  enabled: Schema.Boolean,
  exemptRoles: Schema.Array(RoleId),
  exemptChannels: Schema.Array(ChannelId),
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    creatorId: "creator_id",
    eventType: "event_type",
    triggerType: "trigger_type",
    triggerMetadata: "trigger_metadata",
    exemptRoles: "exempt_roles",
    exemptChannels: "exempt_channels",
  }),
);
export type AutoModerationRule = typeof AutoModerationRule.Type;

// Action execution (AUTO_MODERATION_ACTION_EXECUTION gateway payload) is
// deferred: it is a gateway event shape, and gateway transport is out of
// scope for this module.
