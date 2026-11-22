import { HashMap, Schema } from "effect";
import * as BitSet from "@/util/bitset";
import { ApplicationId } from "@/model/application/application";
import { EmojiId } from "@/model/emoji";

// https://docs.discord.com/developers/events/gateway-events#activity-object-activity-types
// Verified: only 0-5 are documented. No type 6 exists in current docs.
export const ActivityType = Schema.Enum({
  Playing: 0,
  Streaming: 1,
  Listening: 2,
  Watching: 3,
  Custom: 4,
  Competing: 5,
});
export type ActivityType = typeof ActivityType.Type;

// https://docs.discord.com/developers/events/gateway-events#activity-object-status-display-types
export const StatusDisplayType = Schema.Enum({
  Name: 0,
  State: 1,
  Details: 2,
});
export type StatusDisplayType = typeof StatusDisplayType.Type;

export const ActivityTimestamps = Schema.Struct({
  start: Schema.optionalKey(Schema.Int),
  end: Schema.optionalKey(Schema.Int),
});
export type ActivityTimestamps = typeof ActivityTimestamps.Type;

// https://docs.discord.com/developers/events/gateway-events#activity-object-activity-emoji
// id is documented as optional; it is nullable here because gateway traffic sends
// explicit null for unicode emoji (e.g. custom statuses), matching the ecosystem.
export const ActivityEmoji = Schema.Struct({
  name: Schema.String,
  id: Schema.optionalKey(Schema.NullOr(EmojiId)),
  animated: Schema.optionalKey(Schema.Boolean),
});
export type ActivityEmoji = typeof ActivityEmoji.Type;

// https://docs.discord.com/developers/events/gateway-events#activity-object-activity-party
export const ActivityParty = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(Schema.Tuple([Schema.Int, Schema.Int])),
});
export type ActivityParty = typeof ActivityParty.Type;

// https://docs.discord.com/developers/events/gateway-events#activity-object-activity-assets
export const ActivityAssets = Schema.Struct({
  largeImage: Schema.optionalKey(Schema.String),
  largeText: Schema.optionalKey(Schema.String),
  largeUrl: Schema.optionalKey(Schema.String),
  smallImage: Schema.optionalKey(Schema.String),
  smallText: Schema.optionalKey(Schema.String),
  smallUrl: Schema.optionalKey(Schema.String),
  inviteCoverImage: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    largeImage: "large_image",
    largeText: "large_text",
    largeUrl: "large_url",
    smallImage: "small_image",
    smallText: "small_text",
    smallUrl: "small_url",
    inviteCoverImage: "invite_cover_image",
  }),
);
export type ActivityAssets = typeof ActivityAssets.Type;

// https://docs.discord.com/developers/events/gateway-events#activity-object-activity-secrets
export const ActivitySecrets = Schema.Struct({
  join: Schema.optionalKey(Schema.String),
  spectate: Schema.optionalKey(Schema.String),
  match: Schema.optionalKey(Schema.String),
});
export type ActivitySecrets = typeof ActivitySecrets.Type;

export const ActivityFlag = HashMap.fromIterable([
  ["Instance", 1 << 0],
  ["Join", 1 << 1],
  ["Spectate", 1 << 2],
  ["JoinRequest", 1 << 3],
  ["Sync", 1 << 4],
  ["Play", 1 << 5],
  ["PartyPrivacyFriends", 1 << 6],
  ["PartyPrivacyVoiceChannel", 1 << 7],
  ["Embedded", 1 << 8],
] as const);

export type ActivityFlag = HashMap.HashMap.Key<typeof ActivityFlag>;

const activity = BitSet.make("ActivityBitSet", ActivityFlag);

export const ActivityBitSet = activity.BitSet;
export type ActivityBitSet = InstanceType<typeof ActivityBitSet>;

export const ActivityFlags = activity.fromNumber;
export type ActivityFlags = typeof ActivityFlags.Type;

// https://docs.discord.com/developers/events/gateway-events#activity-object
// Unix-millisecond fields (created_at, timestamps) stay Int; only ISO8601 strings
// become DateTime. buttons is an array of label strings on receive; the label/url
// object shape is send-only and intentionally rejected here.
export const Activity = Schema.Struct({
  name: Schema.String,
  type: ActivityType,
  url: Schema.optionalKey(Schema.NullOr(Schema.String)),
  createdAt: Schema.Int,
  timestamps: Schema.optionalKey(ActivityTimestamps),
  // Application id; imported from the application module (leaf-safe: the
  // application module never imports presence).
  applicationId: Schema.optionalKey(ApplicationId),
  statusDisplayType: Schema.optionalKey(Schema.NullOr(StatusDisplayType)),
  details: Schema.optionalKey(Schema.NullOr(Schema.String)),
  detailsUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  state: Schema.optionalKey(Schema.NullOr(Schema.String)),
  stateUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  emoji: Schema.optionalKey(Schema.NullOr(ActivityEmoji)),
  party: Schema.optionalKey(ActivityParty),
  assets: Schema.optionalKey(ActivityAssets),
  secrets: Schema.optionalKey(ActivitySecrets),
  instance: Schema.optionalKey(Schema.Boolean),
  flags: Schema.optionalKey(ActivityFlags),
  buttons: Schema.optionalKey(Schema.Array(Schema.String).check(Schema.isMaxLength(2))),
}).pipe(
  Schema.encodeKeys({
    createdAt: "created_at",
    applicationId: "application_id",
    statusDisplayType: "status_display_type",
    detailsUrl: "details_url",
    stateUrl: "state_url",
  }),
);
export type Activity = typeof Activity.Type;
