import { HashMap, Schema } from "effect";
import * as BitSet from "@/util/bitset";
import { PermissionFlags } from "@/model/permission/flags";
import { RoleId } from "@/model/role/id";
import { AvatarDecorationData, Collectibles, User } from "@/model/user/user";

// https://docs.discord.com/developers/resources/guild#guild-member-object-guild-member-flags
// Verified against current docs. Bit 1 << 8 is unassigned; only documented bits are
// included and unknown bits survive round-trips via the underlying BitSet.
export const GuildMemberFlag = HashMap.fromIterable([
  ["DidRejoin", 1 << 0],
  ["CompletedOnboarding", 1 << 1],
  ["BypassesVerification", 1 << 2],
  ["StartedOnboarding", 1 << 3],
  ["IsGuest", 1 << 4],
  ["StartedHomeActions", 1 << 5],
  ["CompletedHomeActions", 1 << 6],
  ["AutomodQuarantinedUsername", 1 << 7],
  ["DmSettingsUpsellAcknowledged", 1 << 9],
  ["AutomodQuarantinedGuildTag", 1 << 10],
] as const);

export type GuildMemberFlag = HashMap.HashMap.Key<typeof GuildMemberFlag>;

const member = BitSet.make("GuildMemberBitSet", GuildMemberFlag);

export const GuildMemberBitSet = member.BitSet;
export type GuildMemberBitSet = InstanceType<typeof GuildMemberBitSet>;

export const GuildMemberFlags = member.fromNumber;
export type GuildMemberFlags = typeof GuildMemberFlags.Type;

// https://docs.discord.com/developers/resources/guild#guild-member-object
// REST shape: joined_at is a required (nullable) key. Gateway variance, all covered:
// - user is absent on MESSAGE_CREATE / MESSAGE_UPDATE member payloads (optional here).
// - joined_at is null (not absent) for guests invited via VOICE_STATE_UPDATE.
// - pending is omitted outside GUILD_* events (optional here).
// unusual_dm_activity_until is not a documented member field and is omitted.
const memberFields = {
  user: Schema.optionalKey(User),
  nick: Schema.optionalKey(Schema.NullOr(Schema.String)),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
  banner: Schema.optionalKey(Schema.NullOr(Schema.String)),
  roles: Schema.Array(RoleId),
  joinedAt: Schema.NullOr(Schema.DateTimeUtcFromString),
  premiumSince: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
  deaf: Schema.Boolean,
  mute: Schema.Boolean,
  flags: GuildMemberFlags,
  pending: Schema.optionalKey(Schema.Boolean),
  permissions: Schema.optionalKey(PermissionFlags),
  communicationDisabledUntil: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
  avatarDecorationData: Schema.optionalKey(Schema.NullOr(AvatarDecorationData)),
  collectibles: Schema.optionalKey(Schema.NullOr(Collectibles)),
};

const memberKeys = {
  joinedAt: "joined_at",
  premiumSince: "premium_since",
  communicationDisabledUntil: "communication_disabled_until",
  avatarDecorationData: "avatar_decoration_data",
} as const;

export const GuildMember = Schema.Struct(memberFields).pipe(Schema.encodeKeys(memberKeys));
export type GuildMember = typeof GuildMember.Type;

// Lenient gateway decoder: same fields, but joined_at may also be absent.
// Base GuildMember already tolerates absent user / pending and null joined_at.
export const GatewayGuildMember = Schema.Struct({
  ...memberFields,
  joinedAt: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
}).pipe(Schema.encodeKeys(memberKeys));
export type GatewayGuildMember = typeof GatewayGuildMember.Type;
