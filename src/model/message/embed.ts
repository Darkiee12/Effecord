import { HashMap, Schema } from "effect";
import * as BitSet from "@/util/bitset";

// https://docs.discord.com/developers/resources/message#embed-object-embed-types
// Strict: docs list exactly these 8 with no forward-compatibility note.
// Reject unknown strings; extend when Discord documents new types.
export const EmbedType = Schema.Enum({
  Rich: "rich",
  Image: "image",
  Video: "video",
  Gifv: "gifv",
  Article: "article",
  Link: "link",
  PollResult: "poll_result",
  Components: "components",
});
export type EmbedType = typeof EmbedType.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-flags
export const EmbedFlag = HashMap.fromIterable([
  ["ContainsExplicitContent", 1 << 4],
  ["IsContentInventoryEntry", 1 << 5],
  ["ContainsGoreContent", 1 << 6],
  ["ContainsSelfHarmContent", 1 << 7],
] as const);

export type EmbedFlag = HashMap.HashMap.Key<typeof EmbedFlag>;

const embed = BitSet.make("EmbedBitSet", EmbedFlag);

export const EmbedBitSet = embed.BitSet;
export type EmbedBitSet = InstanceType<typeof EmbedBitSet>;

// Embed flags travel as JSON numbers on the wire.
export const EmbedFlags = embed.fromNumber;
export type EmbedFlags = typeof EmbedFlags.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-media-flags
export const EmbedMediaFlag = HashMap.fromIterable([["IsAnimated", 1 << 5]] as const);

export type EmbedMediaFlag = HashMap.HashMap.Key<typeof EmbedMediaFlag>;

const embedMedia = BitSet.make("EmbedMediaBitSet", EmbedMediaFlag);

export const EmbedMediaBitSet = embedMedia.BitSet;
export type EmbedMediaBitSet = InstanceType<typeof EmbedMediaBitSet>;

export const EmbedMediaFlags = embedMedia.fromNumber;
export type EmbedMediaFlags = typeof EmbedMediaFlags.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-author-structure
export const EmbedAuthor = Schema.Struct({
  name: Schema.String,
  url: Schema.optionalKey(Schema.String),
  iconUrl: Schema.optionalKey(Schema.String),
  proxyIconUrl: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    iconUrl: "icon_url",
    proxyIconUrl: "proxy_icon_url",
  }),
);
export type EmbedAuthor = typeof EmbedAuthor.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-footer-structure
export const EmbedFooter = Schema.Struct({
  text: Schema.String,
  iconUrl: Schema.optionalKey(Schema.String),
  proxyIconUrl: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    iconUrl: "icon_url",
    proxyIconUrl: "proxy_icon_url",
  }),
);
export type EmbedFooter = typeof EmbedFooter.Type;

const embedImageFields = {
  proxyUrl: Schema.optionalKey(Schema.String),
  height: Schema.optionalKey(Schema.Int),
  width: Schema.optionalKey(Schema.Int),
  contentType: Schema.optionalKey(Schema.String),
  placeholder: Schema.optionalKey(Schema.String),
  placeholderVersion: Schema.optionalKey(Schema.Int),
  description: Schema.optionalKey(Schema.String),
  flags: Schema.optionalKey(EmbedMediaFlags),
};

const embedImageKeys = {
  proxyUrl: "proxy_url",
  contentType: "content_type",
  placeholderVersion: "placeholder_version",
} as const;

// https://docs.discord.com/developers/resources/message#embed-object-embed-image-structure
// Thumbnail shares the image structure exactly (url required).
export const EmbedImage = Schema.Struct({
  url: Schema.String,
  ...embedImageFields,
}).pipe(Schema.encodeKeys(embedImageKeys));
export type EmbedImage = typeof EmbedImage.Type;

export const EmbedThumbnail = Schema.Struct({
  url: Schema.String,
  ...embedImageFields,
}).pipe(Schema.encodeKeys(embedImageKeys));
export type EmbedThumbnail = typeof EmbedThumbnail.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-video-structure
// Every video field is optional.
export const EmbedVideo = Schema.Struct({
  url: Schema.optionalKey(Schema.String),
  ...embedImageFields,
}).pipe(Schema.encodeKeys(embedImageKeys));
export type EmbedVideo = typeof EmbedVideo.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-provider-structure
export const EmbedProvider = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
  url: Schema.optionalKey(Schema.String),
});
export type EmbedProvider = typeof EmbedProvider.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-field-structure
export const EmbedField = Schema.Struct({
  name: Schema.String,
  value: Schema.String,
  inline: Schema.optionalKey(Schema.Boolean),
});
export type EmbedField = typeof EmbedField.Type;

// https://docs.discord.com/developers/resources/message#embed-object-embed-structure
export const Embed = Schema.Struct({
  title: Schema.optionalKey(Schema.String),
  type: Schema.optionalKey(EmbedType),
  description: Schema.optionalKey(Schema.String),
  url: Schema.optionalKey(Schema.String),
  timestamp: Schema.optionalKey(Schema.DateTimeUtcFromString),
  color: Schema.optionalKey(Schema.Int),
  footer: Schema.optionalKey(EmbedFooter),
  image: Schema.optionalKey(EmbedImage),
  thumbnail: Schema.optionalKey(EmbedThumbnail),
  video: Schema.optionalKey(EmbedVideo),
  provider: Schema.optionalKey(EmbedProvider),
  author: Schema.optionalKey(EmbedAuthor),
  // Docs cap fields at 25; character limits are send-side validation.
  fields: Schema.optionalKey(Schema.Array(EmbedField).check(Schema.isMaxLength(25))),
  // TODO: model component-embed children once their allowed subset is pinned
  // down. Only present on `components` type embeds.
  components: Schema.optionalKey(Schema.Array(Schema.Unknown)),
  flags: Schema.optionalKey(EmbedFlags),
});
export type Embed = typeof Embed.Type;
