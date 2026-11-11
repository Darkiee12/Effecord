import { Schema } from "effect";

import { RoleId } from "@/model/role/id";
import { User } from "@/model/user/user";

import { EmojiId } from "./id";

// https://docs.discord.com/developers/resources/emoji#emoji-object
// id+name correlation: custom emoji carry an id (name may be null when the
// emoji was deleted), unicode emoji carry only a name. (null, null) is invalid.
const customEmojiFields = {
  id: EmojiId,
  name: Schema.NullOr(Schema.String),
};

const unicodeEmojiFields = {
  id: Schema.Null,
  name: Schema.String,
};

const emojiExtras = {
  roles: Schema.optionalKey(Schema.Array(RoleId)),
  user: Schema.optionalKey(User),
  requireColons: Schema.optionalKey(Schema.Boolean),
  managed: Schema.optionalKey(Schema.Boolean),
  animated: Schema.optionalKey(Schema.Boolean),
  available: Schema.optionalKey(Schema.Boolean),
};

const emojiKeys = {
  requireColons: "require_colons",
} as const;

// Full emoji object. `id`/`name` are required keys that may be null;
// `roles`/`user`/`require_colons`/`managed`/`animated`/`available` are optional.
export const Emoji = Schema.Union([
  Schema.Struct({ ...customEmojiFields, ...emojiExtras }).pipe(
    Schema.encodeKeys(emojiKeys),
  ),
  Schema.Struct({ ...unicodeEmojiFields, ...emojiExtras }).pipe(
    Schema.encodeKeys(emojiKeys),
  ),
]);
export type Emoji = typeof Emoji.Type;

// Partial emoji object sent inside reactions and gateway events.
// Reused by "@/model/reaction" instead of redefining id/name correlation.
export const EmojiPartial = Schema.Union([
  Schema.Struct({
    ...customEmojiFields,
    animated: Schema.optionalKey(Schema.Boolean),
  }),
  Schema.Struct(unicodeEmojiFields),
]);
export type EmojiPartial = typeof EmojiPartial.Type;
