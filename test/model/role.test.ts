import { describe, expect, expectTypeOf, test } from "bun:test";

import { Schema } from "effect";

import { Role, RoleBitSet, RoleColors, RoleFlags, RoleTags } from "@/model/role";

// Based on the Role Object example in Discord's Permissions documentation.
const exampleRole = {
  id: "41771983423143936",
  name: "WE DEM BOYZZ!!!!!!",
  color: 3447003,
  colors: {
    primary_color: 3447003,
    secondary_color: null,
    tertiary_color: null,
  },
  hoist: true,
  icon: "cf3ced8600b777c9486c6d8d84fb4327",
  unicode_emoji: null,
  position: 1,
  permissions: "66321471",
  managed: false,
  mentionable: false,
  flags: 0,
} as const;

describe("role model", () => {
  test("decodes Discord's example and encodes the same wire payload", () => {
    const role = Schema.decodeSync(Role)(exampleRole);
    expect(role.id.toString()).toBe("41771983423143936");
    expect(role.colors.primaryColor).toBe(3447003);
    expect(role.unicodeEmoji).toBeNull();
    expect(role.permissions.bits).toBe(66321471n);
    expect(role.flags).toBeInstanceOf(RoleBitSet);
    expect(Schema.encodeSync(Role)(role)).toEqual(exampleRole);
  });

  test("keeps large permissions exact in the existing bigint BitSet", () => {
    const permissions = ((1n << 60n) | (1n << 11n)).toString();
    const wire = { ...exampleRole, permissions };
    const role = Schema.decodeSync(Role)(wire);
    expect(role.permissions.bits).toBe((1n << 60n) | (1n << 11n));
    expect(role.permissions.has("SendMessages")).toBe(true);
    expect(Schema.encodeSync(Role)(role)).toEqual(wire);
  });

  test("decodes role flags as a BitSet and preserves unknown bits", () => {
    const wire = { ...exampleRole, flags: (1 << 8) | (1 << 0) };
    const role = Schema.decodeSync(Role)(wire);
    expect(role.flags).toBeInstanceOf(RoleBitSet);
    expect(role.flags.has("InPrompt")).toBe(true);
    expect(role.flags.bits).toBe(257n);
    expect(Schema.encodeSync(Role)(role)).toEqual(wire);
    expect(Schema.encodeSync(RoleFlags)(role.flags)).toBe(257);
  });

  test("distinguishes absent tag markers from present null markers", () => {
    const absent = Schema.decodeSync(RoleTags)({});
    expect(Object.hasOwn(absent, "premiumSubscriber")).toBe(false);
    expect(Object.hasOwn(absent, "availableForPurchase")).toBe(false);
    expect(Schema.encodeSync(RoleTags)(absent)).toEqual({});

    const wire = {
      bot_id: "123",
      integration_id: "456",
      premium_subscriber: null,
      subscription_listing_id: "789",
      available_for_purchase: null,
      guild_connections: null,
    };
    const present = Schema.decodeSync(RoleTags)(wire);
    expect(Object.hasOwn(present, "premiumSubscriber")).toBe(true);
    expect(present.premiumSubscriber).toBeNull();
    expect(present.botId?.toString()).toBe("123");
    expect(Schema.encodeSync(RoleTags)(present)).toEqual(wire);
    expectTypeOf<RoleTags["premiumSubscriber"]>().toEqualTypeOf<null | undefined>();
    expectTypeOf<Role["tags"]>().toEqualTypeOf<RoleTags | undefined>();
  });

  test("preserves optional icon, emoji, and tags fields", () => {
    const { icon: _icon, unicode_emoji: _unicodeEmoji, ...withoutIcons } = exampleRole;
    const role = Schema.decodeSync(Role)(withoutIcons);
    expect(Object.hasOwn(role, "icon")).toBe(false);
    expect(Object.hasOwn(role, "unicodeEmoji")).toBe(false);
    expect(Object.hasOwn(role, "tags")).toBe(false);
    expect(Schema.encodeSync(Role)(role)).toEqual(withoutIcons);

    const wire = { ...exampleRole, icon: null, unicode_emoji: "🔥", tags: {} };
    expect(Schema.encodeSync(Role)(Schema.decodeSync(Role)(wire))).toEqual(wire);
  });

  test("preserves nullable secondary and tertiary colors", () => {
    const colors = {
      primary_color: 11127295,
      secondary_color: 16759788,
      tertiary_color: 16761760,
    };
    expect(Schema.encodeSync(RoleColors)(Schema.decodeSync(RoleColors)(colors))).toEqual(colors);
    expect(
      Schema.encodeSync(RoleColors)(Schema.decodeSync(RoleColors)(exampleRole.colors)),
    ).toEqual(exampleRole.colors);
    expectTypeOf<RoleColors["secondaryColor"]>().toEqualTypeOf<number | null>();
  });

  test("rejects malformed required fields, colors, flags, and tag markers", () => {
    for (const wire of [
      { ...exampleRole, colors: undefined },
      { ...exampleRole, color: -1 },
      { ...exampleRole, color: 0x1000000 },
      { ...exampleRole, position: 1.5 },
      { ...exampleRole, flags: "1" },
      { ...exampleRole, permissions: "1.5" },
      { ...exampleRole, icon: 42 },
    ]) {
      expect(() => Schema.decodeUnknownSync(Role)(wire)).toThrow();
    }
    expect(() =>
      Schema.decodeUnknownSync(RoleColors)({ primary_color: 1, secondary_color: null }),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(RoleTags)({ premium_subscriber: false })).toThrow();
    expect(() => Schema.decodeUnknownSync(RoleTags)({ guild_connections: true })).toThrow();
  });
});
