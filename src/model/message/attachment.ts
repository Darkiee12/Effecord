import { HashMap, Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import * as BitSet from "@/util/bitset";
import { User } from "@/model/user/user";

import { MessageApplication } from "./application";

export const AttachmentId = Snowflake.fromString.pipe(Schema.brand("AttachmentId"));
export type AttachmentId = typeof AttachmentId.Type;

// https://docs.discord.com/developers/resources/message#attachment-object-attachment-flags
export const AttachmentFlag = HashMap.fromIterable([
  ["IsClip", 1 << 0],
  ["IsThumbnail", 1 << 1],
  // Deprecated (mobile remix feature) but still documented on the wire.
  ["IsRemix", 1 << 2],
  ["IsSpoiler", 1 << 3],
  ["ContainsExplicitContent", 1 << 4],
  ["IsAnimated", 1 << 5],
  ["ContainsGoreContent", 1 << 6],
  ["ContainsSelfHarmContent", 1 << 7],
] as const);

export type AttachmentFlag = HashMap.HashMap.Key<typeof AttachmentFlag>;

const attachment = BitSet.make("AttachmentBitSet", AttachmentFlag);

export const AttachmentBitSet = attachment.BitSet;
export type AttachmentBitSet = InstanceType<typeof AttachmentBitSet>;

// Attachment flags travel as JSON numbers on the wire.
export const AttachmentFlags = attachment.fromNumber;
export type AttachmentFlags = typeof AttachmentFlags.Type;

// https://docs.discord.com/developers/resources/message#attachment-object-attachment-structure
export const Attachment = Schema.Struct({
  id: AttachmentId,
  filename: Schema.String,
  title: Schema.optionalKey(Schema.String),
  description: Schema.optionalKey(Schema.String),
  contentType: Schema.optionalKey(Schema.String),
  size: Schema.Int,
  url: Schema.String,
  proxyUrl: Schema.String,
  height: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  width: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  placeholder: Schema.optionalKey(Schema.String),
  placeholderVersion: Schema.optionalKey(Schema.Int),
  ephemeral: Schema.optionalKey(Schema.Boolean),
  durationSecs: Schema.optionalKey(Schema.Finite),
  waveform: Schema.optionalKey(Schema.String),
  flags: Schema.optionalKey(AttachmentFlags),
  // Array of users in the stream, only present on Clip attachments.
  clipParticipants: Schema.optionalKey(Schema.Array(User)),
  clipCreatedAt: Schema.optionalKey(Schema.DateTimeUtcFromString),
  // The application in the stream, if recognized. Only present on Clips.
  application: Schema.optionalKey(Schema.NullOr(MessageApplication)),
}).pipe(
  Schema.encodeKeys({
    contentType: "content_type",
    proxyUrl: "proxy_url",
    placeholderVersion: "placeholder_version",
    durationSecs: "duration_secs",
    clipParticipants: "clip_participants",
    clipCreatedAt: "clip_created_at",
  }),
);
export type Attachment = typeof Attachment.Type;
