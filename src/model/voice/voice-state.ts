import { Schema } from "effect";
import { ChannelId } from "@/model/channel/channel";
import { GuildMember } from "@/model/guild/member";
import { GuildId } from "@/model/guild/id";
import { UserId } from "@/model/user/user";
import { VoiceRegionId } from "./id";

// https://docs.discord.com/developers/resources/voice#voice-state-object
// channel_id and request_to_speak_timestamp are documented as required-nullable keys;
// both are optional here because gateway traffic omits them outside voice contexts
// (e.g. non-stage channels, cached states). Absent and null both decode; encoding a
// decoded value round-trips the wire shape.
export const VoiceState = Schema.Struct({
  guildId: Schema.optionalKey(GuildId),
  channelId: Schema.optionalKey(Schema.NullOr(ChannelId)),
  userId: UserId,
  member: Schema.optionalKey(GuildMember),
  sessionId: Schema.String,
  deaf: Schema.Boolean,
  mute: Schema.Boolean,
  selfDeaf: Schema.Boolean,
  selfMute: Schema.Boolean,
  selfStream: Schema.optionalKey(Schema.Boolean),
  selfVideo: Schema.Boolean,
  suppress: Schema.Boolean,
  requestToSpeakTimestamp: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    channelId: "channel_id",
    userId: "user_id",
    sessionId: "session_id",
    selfDeaf: "self_deaf",
    selfMute: "self_mute",
    selfStream: "self_stream",
    selfVideo: "self_video",
    requestToSpeakTimestamp: "request_to_speak_timestamp",
  }),
);
export type VoiceState = typeof VoiceState.Type;

// https://docs.discord.com/developers/resources/voice#voice-region-object
export const VoiceRegion = Schema.Struct({
  id: VoiceRegionId,
  name: Schema.String,
  optimal: Schema.Boolean,
  deprecated: Schema.Boolean,
  custom: Schema.Boolean,
});
export type VoiceRegion = typeof VoiceRegion.Type;
