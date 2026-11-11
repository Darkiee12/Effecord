import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { ChannelId } from "@/model/channel/channel";
import { UserId } from "@/model/user/user";
import { ApplicationId } from "@/model/application/application";
import { WebhookId } from "./id";

// https://docs.discord.com/developers/resources/webhook#webhook-object-webhook-types
export const WebhookType = Schema.Enum({
  Incoming: 1,
  ChannelFollower: 2,
  Application: 3,
});
export type WebhookType = typeof WebhookType.Type;

// Full user objects are owned by the user module; only UserId is imported to
// avoid a model-level dependency.
export const WebhookUser = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type WebhookUser = typeof WebhookUser.Type;

// Partial guild of the followed channel (Channel Follower webhooks only).
export const WebhookSourceGuild = Schema.Struct({
  id: GuildId,
  name: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type WebhookSourceGuild = typeof WebhookSourceGuild.Type;

// Partial channel that is being followed (Channel Follower webhooks only).
export const WebhookSourceChannel = Schema.Struct({
  id: ChannelId,
  name: Schema.optionalKey(Schema.String),
});
export type WebhookSourceChannel = typeof WebhookSourceChannel.Type;

// https://docs.discord.com/developers/resources/webhook#webhook-object
export const Webhook = Schema.Struct({
  id: WebhookId,
  type: WebhookType,
  guildId: Schema.optionalKey(Schema.NullOr(GuildId)),
  channelId: Schema.NullOr(ChannelId),
  user: Schema.optionalKey(WebhookUser),
  name: Schema.NullOr(Schema.String),
  avatar: Schema.NullOr(Schema.String),
  token: Schema.optionalKey(Schema.String),
  applicationId: Schema.NullOr(ApplicationId),
  sourceGuild: Schema.optionalKey(WebhookSourceGuild),
  sourceChannel: Schema.optionalKey(WebhookSourceChannel),
  url: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    channelId: "channel_id",
    applicationId: "application_id",
    sourceGuild: "source_guild",
    sourceChannel: "source_channel",
  }),
);
export type Webhook = typeof Webhook.Type;
