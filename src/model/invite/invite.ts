import { HashMap, Schema } from "effect";
import * as BitSet from "@/util/bitset";
import { GuildId } from "@/model/guild/id";
import { ChannelId } from "@/model/channel/channel";
import { RoleId } from "@/model/role/id";
import { UserId } from "@/model/user/user";
import { ApplicationId } from "@/model/application/application";
import { GuildScheduledEvent } from "@/model/scheduled-event/scheduled-event";

// https://docs.discord.com/developers/resources/invite#invite-object-invite-types
export const InviteType = Schema.Enum({
  Guild: 0,
  GroupDm: 1,
  Friend: 2,
});
export type InviteType = typeof InviteType.Type;

// https://docs.discord.com/developers/resources/invite#invite-object-invite-target-types
export const InviteTargetType = Schema.Enum({
  Stream: 1,
  EmbeddedApplication: 2,
});
export type InviteTargetType = typeof InviteTargetType.Type;

// https://docs.discord.com/developers/resources/invite#invite-object-guild-invite-flags
export const GuildInviteFlag = HashMap.fromIterable([["IsGuestInvite", 1 << 0]] as const);
export type GuildInviteFlag = HashMap.HashMap.Key<typeof GuildInviteFlag>;

const guestInvite = BitSet.make("GuildInviteBitSet", GuildInviteFlag);

export const GuildInviteBitSet = guestInvite.BitSet;
export type GuildInviteBitSet = InstanceType<typeof GuildInviteBitSet>;

export const GuildInviteFlags = guestInvite.fromNumber;
export type GuildInviteFlags = typeof GuildInviteFlags.Type;

// Invite codes are opaque strings, NOT snowflakes. Deliberately no brand.
export const InviteCode = Schema.String;
export type InviteCode = typeof InviteCode.Type;

// Minimal partials: full guild/channel/user/role/application shapes are owned
// by other modules; only id brands are imported to avoid cycles.
export const InviteGuild = Schema.Struct({
  id: GuildId,
  name: Schema.optionalKey(Schema.String),
  splash: Schema.optionalKey(Schema.NullOr(Schema.String)),
  banner: Schema.optionalKey(Schema.NullOr(Schema.String)),
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  icon: Schema.optionalKey(Schema.NullOr(Schema.String)),
  vanityUrlCode: Schema.optionalKey(Schema.NullOr(Schema.String)),
  nsfwLevel: Schema.optionalKey(Schema.Int),
  premiumSubscriptionCount: Schema.optionalKey(Schema.Int),
}).pipe(
  Schema.encodeKeys({
    vanityUrlCode: "vanity_url_code",
    nsfwLevel: "nsfw_level",
    premiumSubscriptionCount: "premium_subscription_count",
  }),
);
export type InviteGuild = typeof InviteGuild.Type;

export const InviteChannel = Schema.Struct({
  id: ChannelId,
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  type: Schema.optionalKey(Schema.Int),
});
export type InviteChannel = typeof InviteChannel.Type;

export const InviteUser = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type InviteUser = typeof InviteUser.Type;

export const InviteApplication = Schema.Struct({
  id: ApplicationId,
  name: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.NullOr(Schema.String)),
  description: Schema.optionalKey(Schema.String),
});
export type InviteApplication = typeof InviteApplication.Type;

export const InviteRole = Schema.Struct({
  id: RoleId,
  name: Schema.String,
  position: Schema.optionalKey(Schema.Int),
  color: Schema.optionalKey(Schema.Int),
});
export type InviteRole = typeof InviteRole.Type;

// Deprecated per docs, retained minimally because `stage_instance` still
// appears on invite payloads for stage channels.
export const InviteStageInstance = Schema.Struct({
  topic: Schema.String,
  participantCount: Schema.Int,
  speakerCount: Schema.Int,
  members: Schema.Array(Schema.Unknown),
}).pipe(
  Schema.encodeKeys({
    participantCount: "participant_count",
    speakerCount: "speaker_count",
  }),
);
export type InviteStageInstance = typeof InviteStageInstance.Type;

// https://docs.discord.com/developers/resources/invite#invite-object
const inviteFields = {
  type: InviteType,
  code: InviteCode,
  guild: Schema.optionalKey(InviteGuild),
  channel: Schema.NullOr(InviteChannel),
  inviter: Schema.optionalKey(InviteUser),
  targetType: Schema.optionalKey(InviteTargetType),
  targetUser: Schema.optionalKey(InviteUser),
  targetApplication: Schema.optionalKey(InviteApplication),
  approximatePresenceCount: Schema.optionalKey(Schema.Int),
  approximateMemberCount: Schema.optionalKey(Schema.Int),
  expiresAt: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
  guildScheduledEvent: Schema.optionalKey(GuildScheduledEvent),
  stageInstance: Schema.optionalKey(InviteStageInstance),
  flags: Schema.optionalKey(GuildInviteFlags),
  roles: Schema.optionalKey(Schema.Array(InviteRole)),
} as const;

const inviteKeys = {
  targetType: "target_type",
  targetUser: "target_user",
  targetApplication: "target_application",
  approximatePresenceCount: "approximate_presence_count",
  approximateMemberCount: "approximate_member_count",
  expiresAt: "expires_at",
  guildScheduledEvent: "guild_scheduled_event",
  stageInstance: "stage_instance",
} as const;

export const Invite = Schema.Struct(inviteFields).pipe(Schema.encodeKeys(inviteKeys));
export type Invite = typeof Invite.Type;

// https://docs.discord.com/developers/resources/invite#invite-metadata-object
const inviteMetadataFields = {
  uses: Schema.Int,
  maxUses: Schema.Int,
  maxAge: Schema.Int,
  temporary: Schema.Boolean,
  createdAt: Schema.DateTimeUtcFromString,
} as const;

const inviteMetadataKeys = {
  maxUses: "max_uses",
  maxAge: "max_age",
  createdAt: "created_at",
} as const;

export const InviteMetadata = Schema.Struct(inviteMetadataFields).pipe(
  Schema.encodeKeys(inviteMetadataKeys),
);
export type InviteMetadata = typeof InviteMetadata.Type;

export const ExtendedInvite = Schema.Struct({
  ...inviteFields,
  ...inviteMetadataFields,
}).pipe(Schema.encodeKeys({ ...inviteKeys, ...inviteMetadataKeys }));
export type ExtendedInvite = typeof ExtendedInvite.Type;
