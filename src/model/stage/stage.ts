import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { ChannelId } from "@/model/channel/channel";
import { ScheduledEventId } from "@/model/scheduled-event/id";
import { StageInstanceId } from "./id";

// https://docs.discord.com/developers/resources/stage-instance#stage-instance-object-privacy-level
// PUBLIC is deprecated but still documented on the wire; modeled as-is.
export const StagePrivacyLevel = Schema.Enum({
  Public: 1,
  GuildOnly: 2,
});
export type StagePrivacyLevel = typeof StagePrivacyLevel.Type;

// https://docs.discord.com/developers/resources/stage-instance#stage-instance-object
export const StageInstance = Schema.Struct({
  id: StageInstanceId,
  guildId: GuildId,
  channelId: ChannelId,
  topic: Schema.String,
  privacyLevel: StagePrivacyLevel,
  discoverableDisabled: Schema.Boolean,
  guildScheduledEventId: Schema.NullOr(ScheduledEventId),
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    channelId: "channel_id",
    privacyLevel: "privacy_level",
    discoverableDisabled: "discoverable_disabled",
    guildScheduledEventId: "guild_scheduled_event_id",
  }),
);
export type StageInstance = typeof StageInstance.Type;
