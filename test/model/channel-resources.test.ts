import { describe, expect, expectTypeOf, test } from "bun:test";
import { DateTime, Schema } from "effect";
import {
  ChannelId,
  DefaultReactionEmoji,
  ForumLayout,
  ForumSortOrder,
  ForumTag,
  ForumTagId,
  ThreadMember,
  ThreadMetadata,
  VideoQualityMode,
} from "@/model/channel";
import { UserId } from "@/model/user";
import { EmojiId } from "@/model/emoji";

type ExpectedReaction =
  | { readonly emojiId: EmojiId; readonly emojiName: null }
  | { readonly emojiId: null; readonly emojiName: string };

type ExpectedForumEmoji =
  | ExpectedReaction
  | {
      readonly emojiId: null;
      readonly emojiName: null;
    };

type ExpectedReactionWire =
  | { readonly emoji_id: string; readonly emoji_name: null }
  | { readonly emoji_id: null; readonly emoji_name: string };

type ExpectedForumTagWire = {
  readonly id: string;
  readonly name: string;
  readonly moderated: boolean;
} & (ExpectedReactionWire | { readonly emoji_id: null; readonly emoji_name: null });

const typeProofs = (emojiId: EmojiId, tagId: ForumTagId) => {
  const custom: DefaultReactionEmoji = { emojiId, emojiName: null };
  const unicode: DefaultReactionEmoji = { emojiId: null, emojiName: "🔥" };
  const customTag: ForumTag = {
    id: tagId,
    name: "News",
    moderated: false,
    emojiId,
    emojiName: null,
  };
  const unicodeTag: ForumTag = {
    id: tagId,
    name: "News",
    moderated: false,
    emojiId: null,
    emojiName: "🔥",
  };
  const noTagEmoji: ForumTag = {
    id: tagId,
    name: "News",
    moderated: false,
    emojiId: null,
    emojiName: null,
  };
  const wireTag: typeof ForumTag.Encoded = {
    id: "123",
    name: "News",
    moderated: false,
    emoji_id: "456",
    emoji_name: null,
  };
  // @ts-expect-error A reaction cannot contain both a custom and Unicode emoji.
  const both: DefaultReactionEmoji = { emojiId, emojiName: "🔥" };
  // @ts-expect-error A reaction cannot contain neither emoji.
  const neither: DefaultReactionEmoji = { emojiId: null, emojiName: null };
  // @ts-expect-error A forum tag cannot contain both emoji forms.
  const invalidTag: ForumTag = { ...noTagEmoji, emojiId, emojiName: "🔥" };
  // @ts-expect-error An emoji ID cannot be used as a forum tag ID.
  const wrongTagId: ForumTagId = emojiId;
  // @ts-expect-error A forum sort order outside its documented enum is invalid.
  const invalidSortOrder: ForumSortOrder = 2;
  // @ts-expect-error A forum layout outside its documented enum is invalid.
  const invalidLayout: ForumLayout = 3;
  // @ts-expect-error A video quality mode outside its documented enum is invalid.
  const invalidVideoQuality: VideoQualityMode = 3;
  void [
    custom,
    unicode,
    customTag,
    unicodeTag,
    noTagEmoji,
    wireTag,
    both,
    neither,
    invalidTag,
    wrongTagId,
    invalidSortOrder,
    invalidLayout,
    invalidVideoQuality,
  ];
};
void typeProofs;

describe("thread resource models", () => {
  test("decodes and encodes metadata timestamps and wire keys", () => {
    const wire = {
      archived: false,
      auto_archive_duration: 1440,
      archive_timestamp: "2024-01-02T03:04:05.000Z",
      locked: false,
      invitable: true,
      create_timestamp: null,
    };
    const metadata = Schema.decodeSync(ThreadMetadata)(wire);
    expect(metadata.autoArchiveDuration).toBe(1440);
    expect(DateTime.toEpochMillis(metadata.archiveTimestamp)).toBe(1704164645000);
    expect(metadata.createTimestamp).toBeNull();
    expect(Schema.encodeSync(ThreadMetadata)(metadata)).toEqual(wire);
    expectTypeOf<ThreadMetadata["archiveTimestamp"]>().toEqualTypeOf<DateTime.Utc>();
    expectTypeOf<ThreadMetadata["createTimestamp"]>().toEqualTypeOf<
      DateTime.Utc | null | undefined
    >();
  });

  test("requires core metadata and rejects invalid timestamps", () => {
    const wire = {
      archived: false,
      auto_archive_duration: 60,
      archive_timestamp: "2024-01-02T03:04:05.000Z",
      locked: false,
    };
    expect(Schema.encodeSync(ThreadMetadata)(Schema.decodeSync(ThreadMetadata)(wire))).toEqual(
      wire,
    );
    expect(() => Schema.decodeUnknownSync(ThreadMetadata)({ ...wire, locked: null })).toThrow();
    expect(() =>
      Schema.decodeSync(ThreadMetadata)({ ...wire, archive_timestamp: "not a date" }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(ThreadMetadata)({ ...wire, archived: undefined }),
    ).toThrow();
  });

  test("uses channel and user IDs for optional thread member fields", () => {
    const wire = {
      id: "123",
      user_id: "456",
      join_timestamp: "2024-01-02T03:04:05.000Z",
      flags: 3,
    };
    const member = Schema.decodeSync(ThreadMember)(wire);
    expect(member.id?.toString()).toBe("123");
    expect(member.userId?.toString()).toBe("456");
    expect(Schema.encodeSync(ThreadMember)(member)).toEqual(wire);
    expectTypeOf<ThreadMember["id"]>().toEqualTypeOf<ChannelId | undefined>();
    expectTypeOf<ThreadMember["userId"]>().toEqualTypeOf<UserId | undefined>();
    expectTypeOf<ThreadMember["joinTimestamp"]>().toEqualTypeOf<DateTime.Utc>();

    const gatewayWire = { join_timestamp: wire.join_timestamp, flags: 0 };
    expect(Schema.encodeSync(ThreadMember)(Schema.decodeSync(ThreadMember)(gatewayWire))).toEqual(
      gatewayWire,
    );
    expect(() => Schema.decodeUnknownSync(ThreadMember)({ ...wire, flags: "3" })).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(ThreadMember)({ ...wire, join_timestamp: null }),
    ).toThrow();
  });
});

describe("forum resource models", () => {
  test("roundtrips tags with custom or unicode emoji, and no emoji", () => {
    for (const emoji of [
      { emoji_id: "456", emoji_name: null },
      { emoji_id: null, emoji_name: "🔥" },
      { emoji_id: null, emoji_name: null },
    ]) {
      const wire = { id: "123", name: "News", moderated: true, ...emoji };
      const tag = Schema.decodeSync(ForumTag)(wire);
      expect(tag.id.toString()).toBe("123");
      expect(Schema.encodeSync(ForumTag)(tag)).toEqual(wire);
    }
    expectTypeOf<ForumTag["id"]>().toEqualTypeOf<ForumTagId>();
    expectTypeOf<ForumTag["emojiId"]>().toEqualTypeOf<EmojiId | null>();
    expectTypeOf<ForumTag["emojiName"]>().toEqualTypeOf<string | null>();
    expectTypeOf<ForumTag["emojiId"]>().not.toEqualTypeOf<ForumTagId | null>();
  });

  test("rejects invalid tags and emoji combinations", () => {
    const wire = { id: "123", name: "News", moderated: true, emoji_id: null, emoji_name: null };
    expect(() => Schema.decodeUnknownSync(ForumTag)({ ...wire, id: undefined })).toThrow();
    expect(() => Schema.decodeUnknownSync(ForumTag)({ ...wire, moderated: null })).toThrow();
    expect(() => Schema.decodeSync(ForumTag)({ ...wire, name: "x".repeat(21) })).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(ForumTag)({ ...wire, emoji_id: "456", emoji_name: "🔥" }),
    ).toThrow();
  });

  test("default reaction requires exactly one emoji value", () => {
    for (const wire of [
      { emoji_id: "456", emoji_name: null },
      { emoji_id: null, emoji_name: "🔥" },
    ]) {
      expect(
        Schema.encodeSync(DefaultReactionEmoji)(Schema.decodeSync(DefaultReactionEmoji)(wire)),
      ).toEqual(wire);
    }
    for (const wire of [
      { emoji_id: null, emoji_name: null },
      { emoji_id: "456", emoji_name: "🔥" },
      { emoji_id: null },
    ]) {
      expect(() => Schema.decodeUnknownSync(DefaultReactionEmoji)(wire)).toThrow();
    }
    expectTypeOf<DefaultReactionEmoji>().toEqualTypeOf<ExpectedReaction>();
    expectTypeOf<typeof DefaultReactionEmoji.Encoded>().toEqualTypeOf<ExpectedReactionWire>();
    expectTypeOf<ForumTag>().toExtend<
      {
        readonly id: ForumTagId;
        readonly name: string;
        readonly moderated: boolean;
      } & ExpectedForumEmoji
    >();
    expectTypeOf<typeof ForumTag.Encoded>().toExtend<ExpectedForumTagWire>();
  });

  test("numeric modes keep documented literal values", () => {
    expect(VideoQualityMode.enums.Auto).toBe(1);
    expect(VideoQualityMode.enums.Full).toBe(2);
    expect(ForumSortOrder.enums.LatestActivity).toBe(0);
    expect(ForumSortOrder.enums.CreationDate).toBe(1);
    expect(ForumLayout.enums.NotSet).toBe(0);
    expect(ForumLayout.enums.ListView).toBe(1);
    expect(ForumLayout.enums.GalleryView).toBe(2);
    expectTypeOf<VideoQualityMode>().toEqualTypeOf<1 | 2>();
    expectTypeOf<ForumSortOrder>().toEqualTypeOf<0 | 1>();
    expectTypeOf<ForumLayout>().toEqualTypeOf<0 | 1 | 2>();
    expectTypeOf<typeof ForumSortOrder.Encoded>().toEqualTypeOf<0 | 1>();
    expectTypeOf<typeof ForumLayout.Encoded>().toEqualTypeOf<0 | 1 | 2>();

    for (const [schema, values] of [
      [VideoQualityMode, [1, 2]],
      [ForumSortOrder, [0, 1]],
      [ForumLayout, [0, 1, 2]],
    ] as const) {
      for (const value of values) {
        expect(Schema.encodeSync(schema)(Schema.decodeSync(schema)(value))).toBe(value);
      }
      for (const value of [-1, 1.5, "1", null, 3]) {
        expect(() => Schema.decodeUnknownSync(schema)(value)).toThrow();
      }
    }
  });
});
