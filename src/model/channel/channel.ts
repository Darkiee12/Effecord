import { Record, Schema } from "effect";
import { known, type KnownChannelName, KnownChannelType, UnknownChannelType } from "./type";
import { ObfuscatedChannelFlags, VisibleChannelFlags } from "./flags";
import * as Snowflake from "@/model/snowflake";
import { UserId } from "@/model/user";
import { GuildId } from "@/model/guild/id";

import { PermissionOverwrite } from "@/model/permission";
import { MessageId } from "./message";
import { DefaultReactionEmoji, ForumLayout, ForumSortOrder, ForumTag } from "./forum";
import { VideoQualityMode } from "./video";

export const ChannelId = Snowflake.fromString.pipe(Schema.brand("ChannelId"));
export type ChannelId = typeof ChannelId.Type;

const wireKeys = {
  guildId: "guild_id",
  parentId: "parent_id",
  permissionOverwrites: "permission_overwrites",
  lastMessageId: "last_message_id",
  rateLimitPerUser: "rate_limit_per_user",
  userLimit: "user_limit",
  rtcRegion: "rtc_region",
  videoQualityMode: "video_quality_mode",
  ownerId: "owner_id",
  messageCount: "message_count",
  memberCount: "member_count",
  threadMetadata: "thread_metadata",
  availableTags: "available_tags",
  appliedTags: "applied_tags",
  defaultReactionEmoji: "default_reaction_emoji",
  defaultAutoArchiveDuration: "default_auto_archive_duration",
  defaultThreadRateLimitPerUser: "default_thread_rate_limit_per_user",
  defaultSortOrder: "default_sort_order",
  defaultForumLayout: "default_forum_layout",
  appPermissions: "app_permissions",
} as const;

const base = {
  id: ChannelId,
  flags: Schema.optionalKey(VisibleChannelFlags),
};

const guild = {
  ...base,
  guildId: Schema.optionalKey(GuildId),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  position: Schema.optionalKey(Schema.Int),
  parentId: Schema.optionalKey(Schema.NullOr(ChannelId)),
};

const permissioned = {
  ...guild,
  permissionOverwrites: Schema.optionalKey(Schema.Array(PermissionOverwrite)),
};

const textual = {
  lastMessageId: Schema.optionalKey(Schema.NullOr(MessageId)),
  rateLimitPerUser: Schema.optionalKey(Schema.Int),
};

const voice = {
  bitrate: Schema.optionalKey(Schema.Int),
  userLimit: Schema.optionalKey(Schema.Int),
  rtcRegion: Schema.optionalKey(Schema.NullOr(Schema.String)),
  videoQualityMode: Schema.optionalKey(VideoQualityMode),
};

const thread = {
  ...guild,
  ...textual,
  ownerId: Schema.optionalKey(UserId),
  messageCount: Schema.optionalKey(Schema.Int),
  memberCount: Schema.optionalKey(Schema.Int),
  threadMetadata: Schema.optionalKey(Schema.NullOr(Schema.Unknown)),
};

const forum = {
  ...permissioned,
  // On forum/media channels this is a thread id, NOT a message id.
  lastMessageId: Schema.optionalKey(Schema.NullOr(ChannelId)),
  rateLimitPerUser: Schema.optionalKey(Schema.Int),
  availableTags: Schema.optionalKey(Schema.Array(ForumTag).check(Schema.isMaxLength(20))),
  defaultReactionEmoji: Schema.optionalKey(Schema.NullOr(DefaultReactionEmoji)),
  defaultAutoArchiveDuration: Schema.optionalKey(Schema.Int),
  defaultThreadRateLimitPerUser: Schema.optionalKey(Schema.Int),
  defaultSortOrder: Schema.optionalKey(Schema.NullOr(ForumSortOrder)),
  defaultForumLayout: Schema.optionalKey(ForumLayout),
};

export const GuildTextChannel = Schema.Struct({
  ...permissioned,
  ...textual,
  ...known("GuildText"),
  topic: Schema.optionalKey(Schema.NullOr(Schema.String)),
  nsfw: Schema.optionalKey(Schema.Boolean),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const DMChannel = Schema.Struct({
  ...base,
  ...textual,
  ...known("DM"),
  recipients: Schema.optionalKey(Schema.Array(Schema.Unknown)),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildVoiceChannel = Schema.Struct({
  ...permissioned,
  ...textual,
  ...voice,
  ...known("GuildVoice"),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GroupDMChannel = Schema.Struct({
  ...base,
  ...textual,
  ...known("GroupDM"),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  recipients: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  ownerId: Schema.optionalKey(UserId),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildCategoryChannel = Schema.Struct({
  ...permissioned,
  ...known("GuildCategory"),
  nsfw: Schema.optionalKey(Schema.Boolean),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildAnnouncementChannel = Schema.Struct({
  ...permissioned,
  ...textual,
  ...known("GuildAnnouncement"),
  topic: Schema.optionalKey(Schema.NullOr(Schema.String)),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const AnnouncementThreadChannel = Schema.Struct({
  ...thread,
  ...known("AnnouncementThread"),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const PublicThreadChannel = Schema.Struct({
  ...thread,
  ...known("PublicThread"),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const PrivateThreadChannel = Schema.Struct({
  ...thread,
  ...known("PrivateThread"),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildStageChannel = Schema.Struct({
  ...permissioned,
  ...textual,
  ...voice,
  ...known("GuildStage"),
  topic: Schema.optionalKey(Schema.NullOr(Schema.String)),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildDirectoryChannel = Schema.Struct({
  ...permissioned,
  ...known("GuildDirectory"),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildForumChannel = Schema.Struct({
  ...forum,
  ...known("GuildForum"),
  topic: Schema.optionalKey(Schema.NullOr(Schema.String)),
  nsfw: Schema.optionalKey(Schema.Boolean),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const GuildMediaChannel = Schema.Struct({
  ...forum,
  ...known("GuildMedia"),
  topic: Schema.optionalKey(Schema.NullOr(Schema.String)),
  nsfw: Schema.optionalKey(Schema.Boolean),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

// Every enum member requires a schema with its exact tag/type pair.
const knownChannelSchemas = {
  GuildText: GuildTextChannel,
  DM: DMChannel,
  GuildVoice: GuildVoiceChannel,
  GroupDM: GroupDMChannel,
  GuildCategory: GuildCategoryChannel,
  GuildAnnouncement: GuildAnnouncementChannel,
  AnnouncementThread: AnnouncementThreadChannel,
  PublicThread: PublicThreadChannel,
  PrivateThread: PrivateThreadChannel,
  GuildStage: GuildStageChannel,
  GuildDirectory: GuildDirectoryChannel,
  GuildForum: GuildForumChannel,
  GuildMedia: GuildMediaChannel,
} satisfies {
  readonly [N in KnownChannelName]: Schema.Constraint & {
    readonly Type: {
      readonly _tag: N;
      readonly type: (typeof KnownChannelType.enums)[N];
    };
  };
};

export const KnownChannel = Schema.Union(Record.values(knownChannelSchemas));
export type KnownChannel = typeof KnownChannel.Type;

export const UnknownChannel = Schema.StructWithRest(
  Schema.Struct({
    _tag: Schema.tagDefaultOmit("Unknown"),
    id: ChannelId,
    type: UnknownChannelType,
    flags: Schema.optionalKey(VisibleChannelFlags),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
).pipe(Schema.brand("DecodedChannel"));

export const ObfuscatedGuildChannel = Schema.Struct({
  _tag: Schema.tagDefaultOmit("Obfuscated"),
  id: ChannelId,
  type: Schema.Int,
  flags: ObfuscatedChannelFlags,
  guildId: Schema.optionalKey(GuildId),
  position: Schema.optionalKey(Schema.Int),
  parentId: Schema.optionalKey(Schema.NullOr(ChannelId)),
}).pipe(Schema.encodeKeys(wireKeys), Schema.brand("DecodedChannel"));

export const Channel = Schema.Union([KnownChannel, UnknownChannel]);
export type Channel = typeof Channel.Type;

export const GatewayChannel = Schema.Union([KnownChannel, ObfuscatedGuildChannel, UnknownChannel]);
export type GatewayChannel = typeof GatewayChannel.Type;

export const PartialChannel = Schema.Struct({
  id: ChannelId,
  type: Schema.Int,
  guildId: Schema.optionalKey(GuildId),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  permissions: Schema.optionalKey(Schema.String),
  appPermissions: Schema.optionalKey(Schema.String),
}).pipe(Schema.encodeKeys(wireKeys));
export type PartialChannel = typeof PartialChannel.Type;

export const PrivateChannelTags = ["DM", "GroupDM"] as const satisfies ReadonlyArray<
  KnownChannel["_tag"]
>;

export type PrivateChannel = Extract<
  KnownChannel,
  { readonly _tag: (typeof PrivateChannelTags)[number] }
>;

export type GuildChannel = Exclude<KnownChannel, PrivateChannel>;
