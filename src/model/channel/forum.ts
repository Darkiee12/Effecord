import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { EmojiId } from "@/model/emoji";

export const ForumTagId = Snowflake.fromString.pipe(Schema.brand("ForumTagId"));
export type ForumTagId = typeof ForumTagId.Type;

const emojiKeys = {
  emojiId: "emoji_id",
  emojiName: "emoji_name",
} as const;

const customEmoji = {
  emojiId: EmojiId,
  emojiName: Schema.Null,
};

const unicodeEmoji = {
  emojiId: Schema.Null,
  emojiName: Schema.String,
};

const noEmoji = {
  emojiId: Schema.Null,
  emojiName: Schema.Null,
};

export const DefaultReactionEmoji = Schema.Union([
  Schema.Struct(customEmoji).pipe(Schema.encodeKeys(emojiKeys)),
  Schema.Struct(unicodeEmoji).pipe(Schema.encodeKeys(emojiKeys)),
]);
export type DefaultReactionEmoji = typeof DefaultReactionEmoji.Type;

const tagFields = {
  id: ForumTagId,
  name: Schema.String.check(Schema.isMaxLength(20)),
  moderated: Schema.Boolean,
};

export const ForumTag = Schema.Union([
  Schema.Struct({ ...tagFields, ...customEmoji }).pipe(Schema.encodeKeys(emojiKeys)),
  Schema.Struct({ ...tagFields, ...unicodeEmoji }).pipe(Schema.encodeKeys(emojiKeys)),
  Schema.Struct({ ...tagFields, ...noEmoji }).pipe(Schema.encodeKeys(emojiKeys)),
]);
export type ForumTag = typeof ForumTag.Type;

export const ForumSortOrder = Schema.Enum({
  LatestActivity: 0,
  CreationDate: 1,
});
export type ForumSortOrder = typeof ForumSortOrder.Type;

export const ForumLayout = Schema.Enum({
  NotSet: 0,
  ListView: 1,
  GalleryView: 2,
});
export type ForumLayout = typeof ForumLayout.Type;
