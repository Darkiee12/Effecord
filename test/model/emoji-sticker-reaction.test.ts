import { describe, expect, expectTypeOf, test } from "bun:test";

import { Schema } from "effect";

import { Emoji, EmojiId, EmojiPartial } from "@/model/emoji";
import { RoleId } from "@/model/role/id";
import { UserId } from "@/model/user";
import { Reaction, ReactionCountDetails } from "@/model/reaction";
import {
  Sticker,
  StickerFormatType,
  StickerId,
  StickerItem,
  StickerPack,
  StickerPackId,
  StickerPackSkuId,
  StickerType,
} from "@/model/sticker";

// Guild emoji example from the Discord docs, trimmed to required fields.
const customEmojiWire = {
  id: "41771983429993937",
  name: "LUL",
  roles: ["41771983429993000", "41771983429993111"],
  require_colons: true,
  managed: false,
  animated: false,
} as const;

const unicodeEmojiWire = {
  id: null,
  name: "\uD83D\uDD25",
} as const;

const deletedEmojiWire = {
  id: "41771983429993937",
  name: null,
  animated: true,
} as const;

const stickerWire = {
  id: "749054660769218631",
  name: "Wave",
  tags: "wumpus, hello, wave",
  type: 1,
  format_type: 3,
  description: "Wumpus waves hello",
  pack_id: "847199849233514549",
  sort_value: 12,
} as const;

const stickerPackWire = {
  id: "847199849233514549",
  stickers: [stickerWire],
  name: "Wumpus Beyond",
  sku_id: "847199849233514547",
  cover_sticker_id: "749053689419006003",
  description: "Say hello to Wumpus!",
  banner_asset_id: "761773777976819732",
} as const;

const reactionWire = {
  count: 1,
  count_details: {
    burst: 0,
    normal: 1,
  },
  me: false,
  me_burst: false,
  emoji: unicodeEmojiWire,
  burst_colors: [],
} as const;

const typeProofs = (emojiId: EmojiId, stickerId: StickerId) => {
  const custom: Emoji = { id: emojiId, name: "LUL" };
  const unicode: Emoji = { id: null, name: "\uD83D\uDD25" };
  const deleted: Emoji = { id: emojiId, name: null };
  const partial: EmojiPartial = { id: null, name: "\uD83D\uDD25" };
  const item: StickerItem = { id: stickerId, name: "Wave", formatType: 3 };
  // @ts-expect-error An emoji cannot have neither id nor name.
  const neither: Emoji = { id: null, name: null };
  // @ts-expect-error A partial emoji cannot have neither id nor name.
  const neitherPartial: EmojiPartial = { id: null, name: null };
  // @ts-expect-error A sticker item is not a full sticker.
  const itemAsSticker: Sticker = item;
  // @ts-expect-error An emoji ID cannot be used as a sticker ID.
  const wrongId: StickerId = emojiId;
  // @ts-expect-error A sticker type outside its documented enum is invalid.
  const invalidType: StickerType = 3;
  // @ts-expect-error A sticker format outside its documented enum is invalid.
  const invalidFormat: StickerFormatType = 5;
  void [
    custom,
    unicode,
    deleted,
    partial,
    item,
    neither,
    neitherPartial,
    itemAsSticker,
    wrongId,
    invalidType,
    invalidFormat,
  ];
};
void typeProofs;

describe("emoji model", () => {
  test("roundtrips full custom, unicode, and deleted emoji payloads", () => {
    for (const wire of [customEmojiWire, unicodeEmojiWire, deletedEmojiWire]) {
      expect(Schema.encodeSync(Emoji)(Schema.decodeSync(Emoji)(wire))).toEqual(wire);
    }
    const custom = Schema.decodeSync(Emoji)(customEmojiWire);
    expect(custom.id?.toString()).toBe("41771983429993937");
    if (custom.id !== null) {
      expectTypeOf(custom.id).toEqualTypeOf<EmojiId>();
    }
    expect(Schema.decodeSync(EmojiPartial)(deletedEmojiWire).name).toBeNull();
  });

  test("keeps optional extras absent when omitted and nullable when present", () => {
    const wire = { id: "41771983429993937", name: "LUL" };
    const emoji = Schema.decodeSync(Emoji)(wire);
    expect(Object.hasOwn(emoji, "roles")).toBe(false);
    expect(Object.hasOwn(emoji, "user")).toBe(false);
    expect(Object.hasOwn(emoji, "available")).toBe(false);
    expect(Schema.encodeSync(Emoji)(emoji)).toEqual(wire);

    const withUser = {
      ...wire,
      roles: ["41771983429993000", "41771983429993111"],
      user: {
        id: "96008815106887111",
        username: "Luigi",
        discriminator: "0002",
        global_name: null,
        avatar: null,
      },
      available: true,
    };
    const decoded = Schema.decodeSync(Emoji)(withUser);
    expect(decoded.roles).toHaveLength(2);
    expect(decoded.roles?.[0]?.toString()).toBe("41771983429993000");
    expectTypeOf(decoded.roles?.[0]).toEqualTypeOf<RoleId | undefined>();
    expect(decoded.user?.username).toBe("Luigi");
    expect(Schema.encodeSync(Emoji)(decoded)).toEqual(withUser);
  });

  test("rejects neither-null combos and malformed emoji", () => {
    for (const wire of [
      { id: null, name: null },
      { id: null },
      { name: "LUL" },
      { id: "not-a-snowflake", name: "LUL" },
    ]) {
      expect(() => Schema.decodeUnknownSync(Emoji)(wire)).toThrow();
      expect(() => Schema.decodeUnknownSync(EmojiPartial)(wire)).toThrow();
    }
    // Roles must be valid snowflakes on the full object; the partial strips
    // unknown keys instead of rejecting them.
    expect(() =>
      Schema.decodeUnknownSync(Emoji)({ id: "41771983429993937", name: "LUL", roles: [42] }),
    ).toThrow();
    const stripped = Schema.decodeUnknownSync(EmojiPartial)({ id: "1", name: "x", roles: [42] });
    expect(stripped.id?.toString()).toBe("1");
    // Both id and name set is a valid custom emoji, not a violation.
    expect(Schema.decodeSync(EmojiPartial)(deletedEmojiWire).id?.toString()).toBe(
      "41771983429993937",
    );
  });

  test("brands snowflake IDs distinctly from strings and other IDs", () => {
    const emojiId = Schema.decodeSync(EmojiId)("41771983429993937");
    expect(emojiId.toString()).toBe("41771983429993937");
    expectTypeOf(emojiId).toEqualTypeOf<EmojiId>();
    expectTypeOf<EmojiId>().not.toEqualTypeOf<string>();
    expectTypeOf<EmojiId>().not.toEqualTypeOf<UserId>();
    expect(() => Schema.decodeUnknownSync(EmojiId)("0")).toThrow();
  });
});

describe("sticker model", () => {
  test("roundtrips the documented sticker example", () => {
    const sticker = Schema.decodeSync(Sticker)(stickerWire);
    expect(sticker.id.toString()).toBe("749054660769218631");
    expect(sticker.type).toBe(1);
    expect(sticker.formatType).toBe(3);
    expect(sticker.description).toBe("Wumpus waves hello");
    expect(Schema.encodeSync(Sticker)(sticker)).toEqual(stickerWire);
  });

  test("keeps optional sticker fields absent when omitted", () => {
    const wire = {
      id: "749054660769218631",
      name: "Wave",
      description: null,
      tags: "wave",
      type: 2,
      format_type: 1,
    } as const;
    const sticker = Schema.decodeSync(Sticker)(wire);
    expect(Object.hasOwn(sticker, "packId")).toBe(false);
    expect(Object.hasOwn(sticker, "guildId")).toBe(false);
    expect(Object.hasOwn(sticker, "available")).toBe(false);
    expect(sticker.description).toBeNull();
    expect(Schema.encodeSync(Sticker)(sticker)).toEqual(wire);
    expectTypeOf<Sticker["packId"]>().toEqualTypeOf<StickerPackId | undefined>();
    expectTypeOf<Sticker["description"]>().toEqualTypeOf<string | null>();
  });

  test("distinguishes sticker items from full stickers", () => {
    const wire = { id: "749054660769218631", name: "Wave", format_type: 4 } as const;
    const item = Schema.decodeSync(StickerItem)(wire);
    expect(item.formatType).toBe(4);
    expect(Schema.encodeSync(StickerItem)(item)).toEqual(wire);
    expectTypeOf<StickerItem["id"]>().toEqualTypeOf<StickerId>();
    // A full sticker wire projects down to its item shape (excess keys strip).
    const projected = Schema.decodeSync(StickerItem)(stickerWire);
    expect(Schema.encodeSync(StickerItem)(projected)).toEqual({
      id: stickerWire.id,
      name: stickerWire.name,
      format_type: stickerWire.format_type,
    });
    expect(() => Schema.decodeUnknownSync(Sticker)(wire)).toThrow();
  });

  test("roundtrips sticker packs with nested stickers", () => {
    const pack = Schema.decodeSync(StickerPack)(stickerPackWire);
    expect(pack.id.toString()).toBe("847199849233514549");
    expect(pack.stickers).toHaveLength(1);
    expect(pack.coverStickerId?.toString()).toBe("749053689419006003");
    expect(Schema.encodeSync(StickerPack)(pack)).toEqual(stickerPackWire);
    expectTypeOf<StickerPack["skuId"]>().toEqualTypeOf<StickerPackSkuId>();
    expectTypeOf<StickerPack["coverStickerId"]>().toEqualTypeOf<StickerId | undefined>();

    const { cover_sticker_id: _cover, banner_asset_id: _banner, ...minimal } = stickerPackWire;
    expect(Schema.encodeSync(StickerPack)(Schema.decodeSync(StickerPack)(minimal))).toEqual(
      minimal,
    );
  });

  test("enums keep documented values and reject unknown variants", () => {
    expect(StickerType.enums.Standard).toBe(1);
    expect(StickerType.enums.Guild).toBe(2);
    expect(StickerFormatType.enums.PNG).toBe(1);
    expect(StickerFormatType.enums.APNG).toBe(2);
    expect(StickerFormatType.enums.Lottie).toBe(3);
    expect(StickerFormatType.enums.GIF).toBe(4);
    expectTypeOf<StickerType>().toEqualTypeOf<1 | 2>();
    expectTypeOf<StickerFormatType>().toEqualTypeOf<1 | 2 | 3 | 4>();
    for (const value of [0, 3, "1", null, 1.5]) {
      expect(() => Schema.decodeUnknownSync(StickerType)(value)).toThrow();
    }
    for (const value of [0, 5, "GIF", null]) {
      expect(() => Schema.decodeUnknownSync(StickerFormatType)(value)).toThrow();
    }
    expect(() => Schema.decodeUnknownSync(Sticker)({ ...stickerWire, type: 3 })).toThrow();
  });
});

describe("reaction model", () => {
  test("roundtrips the documented reaction example", () => {
    const reaction = Schema.decodeSync(Reaction)(reactionWire);
    expect(reaction.count).toBe(1);
    expect(reaction.countDetails.normal).toBe(1);
    expect(reaction.countDetails.burst).toBe(0);
    expect(reaction.emoji).toEqual({ id: null, name: "\uD83D\uDD25" });
    expect(Schema.encodeSync(Reaction)(reaction)).toEqual(reactionWire);
    expectTypeOf<Reaction["countDetails"]>().toEqualTypeOf<ReactionCountDetails>();
    expectTypeOf<Reaction["emoji"]>().toEqualTypeOf<EmojiPartial>();
    expectTypeOf<ReactionCountDetails["burst"]>().toEqualTypeOf<number>();
  });

  test("reuses the emoji partial for custom and deleted emoji", () => {
    const customWire = { ...reactionWire, emoji: { id: "41771983429993937", name: "LUL" } };
    expect(Schema.encodeSync(Reaction)(Schema.decodeSync(Reaction)(customWire))).toEqual(
      customWire,
    );
    const burstWire = {
      ...reactionWire,
      count_details: { burst: 2, normal: 3 },
      count: 5,
      me_burst: true,
      emoji: deletedEmojiWire,
      burst_colors: ["FF0000"],
    };
    const burst = Schema.decodeSync(Reaction)(burstWire);
    expect(burst.meBurst).toBe(true);
    expect(burst.burstColors).toEqual(["FF0000"]);
    expect(Schema.encodeSync(Reaction)(burst)).toEqual(burstWire);
  });

  test("rejects malformed reactions and count details", () => {
    for (const wire of [
      { ...reactionWire, count_details: { burst: 0 } },
      { ...reactionWire, count_details: { burst: 0, normal: 1.5 } },
      { ...reactionWire, emoji: { id: null, name: null } },
      { ...reactionWire, me_burst: undefined },
      { ...reactionWire, burst_colors: null },
    ]) {
      expect(() => Schema.decodeUnknownSync(Reaction)(wire)).toThrow();
    }
  });
});
