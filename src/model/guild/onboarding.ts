import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { ChannelId } from "@/model/channel/channel";
import { RoleId } from "@/model/role/id";
import { EmojiId } from "@/model/emoji/id";
import * as Snowflake from "@/model/snowflake";

export const OnboardingPromptId = Snowflake.fromString.pipe(Schema.brand("OnboardingPromptId"));
export type OnboardingPromptId = typeof OnboardingPromptId.Type;

export const OnboardingPromptOptionId = Snowflake.fromString.pipe(
  Schema.brand("OnboardingPromptOptionId"),
);
export type OnboardingPromptOptionId = typeof OnboardingPromptOptionId.Type;

// https://docs.discord.com/developers/resources/guild#guild-onboarding-object-onboarding-mode
export const OnboardingMode = Schema.Enum({
  OnboardingDefault: 0,
  OnboardingAdvanced: 1,
});
export type OnboardingMode = typeof OnboardingMode.Type;

// https://docs.discord.com/developers/resources/guild#guild-onboarding-object-prompt-types
export const OnboardingPromptType = Schema.Enum({
  MultipleChoice: 0,
  Dropdown: 1,
});
export type OnboardingPromptType = typeof OnboardingPromptType.Type;

// Read shape of a prompt option emoji (`{id, name, animated}`).
export const OnboardingPromptEmoji = Schema.Struct({
  id: Schema.NullOr(EmojiId),
  name: Schema.String,
  animated: Schema.Boolean,
});
export type OnboardingPromptEmoji = typeof OnboardingPromptEmoji.Type;

// https://docs.discord.com/developers/resources/guild#guild-onboarding-object-prompt-option-structure
// Writes use `emoji_id` / `emoji_name` / `emoji_animated` instead of the
// `emoji` object; both are accepted here since reads return `emoji`.
export const OnboardingPromptOption = Schema.Struct({
  id: OnboardingPromptOptionId,
  channelIds: Schema.Array(ChannelId),
  roleIds: Schema.Array(RoleId),
  emoji: Schema.optionalKey(OnboardingPromptEmoji),
  emojiId: Schema.optionalKey(EmojiId),
  emojiName: Schema.optionalKey(Schema.String),
  emojiAnimated: Schema.optionalKey(Schema.Boolean),
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
}).pipe(
  Schema.encodeKeys({
    channelIds: "channel_ids",
    roleIds: "role_ids",
    emojiId: "emoji_id",
    emojiName: "emoji_name",
    emojiAnimated: "emoji_animated",
  }),
);
export type OnboardingPromptOption = typeof OnboardingPromptOption.Type;

// https://docs.discord.com/developers/resources/guild#guild-onboarding-object-onboarding-prompt-structure
export const OnboardingPrompt = Schema.Struct({
  id: OnboardingPromptId,
  type: OnboardingPromptType,
  options: Schema.Array(OnboardingPromptOption),
  title: Schema.String,
  singleSelect: Schema.Boolean,
  required: Schema.Boolean,
  inOnboarding: Schema.Boolean,
}).pipe(
  Schema.encodeKeys({
    singleSelect: "single_select",
    inOnboarding: "in_onboarding",
  }),
);
export type OnboardingPrompt = typeof OnboardingPrompt.Type;

// https://docs.discord.com/developers/resources/guild#guild-onboarding-object
export const GuildOnboarding = Schema.Struct({
  guildId: GuildId,
  prompts: Schema.Array(OnboardingPrompt),
  defaultChannelIds: Schema.Array(ChannelId),
  enabled: Schema.Boolean,
  mode: OnboardingMode,
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    defaultChannelIds: "default_channel_ids",
  }),
);
export type GuildOnboarding = typeof GuildOnboarding.Type;
