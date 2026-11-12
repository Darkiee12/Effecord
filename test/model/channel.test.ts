import { describe, expect, expectTypeOf, test } from "bun:test";
import { Schema } from "effect";
import { MessageId } from "@/model/channel/message";
import {
  Channel,
  ChannelId,
  GatewayChannel,
  GuildForumChannel,
  GuildTextChannel,
  KnownChannel,
} from "@/model/channel";
import {
  known,
  type KnownChannelName,
  KnownChannelType,
  UnknownChannelType,
} from "@/model/channel";

// Checked by TypeScript, never invoked: invalid schema construction must not execute.
const rejectedCalls = (name: KnownChannelName) => {
  // @ts-expect-error Unknown names cannot define a channel.
  known("GuildTypo");
  // @ts-expect-error A union of names would lose the tag/type correlation.
  known(name);
};
void rejectedCalls;

describe("channel type safety", () => {
  test("preserves literal pairs and union narrowing", () => {
    const fields = known("GuildText");
    expectTypeOf<typeof fields._tag.Type>().toEqualTypeOf<"GuildText">();
    expectTypeOf<typeof fields.type.Type>().toEqualTypeOf<0>();
    expectTypeOf<KnownChannel["_tag"]>().toEqualTypeOf<KnownChannelName>();
    expectTypeOf<KnownChannel["type"]>().toEqualTypeOf<KnownChannelType>();
    expectTypeOf<Extract<KnownChannel, { _tag: "DM" }>["type"]>().toEqualTypeOf<1>();
    expectTypeOf<{ _tag: "GuildText"; type: 1 }>().not.toExtend<
      Pick<typeof GuildTextChannel.Type, "_tag" | "type">
    >();
    expectTypeOf<number>().not.toExtend<UnknownChannelType>();
    expectTypeOf<
      NonNullable<typeof GuildForumChannel.Type.lastMessageId>
    >().toEqualTypeOf<ChannelId>();
    expectTypeOf<
      NonNullable<typeof GuildTextChannel.Type.lastMessageId>
    >().toEqualTypeOf<MessageId>();

    const channel = Schema.decodeSync(KnownChannel)({ id: "1", type: 1 });
    if (channel._tag === "DM") {
      expectTypeOf(channel.type).toEqualTypeOf<1>();
      expect(channel.type).toBe(1);
    } else {
      throw new Error("Expected DM");
    }
  });

  test.each([
    [0, "GuildText"],
    [1, "DM"],
    [2, "GuildVoice"],
    [3, "GroupDM"],
    [4, "GuildCategory"],
    [5, "GuildAnnouncement"],
    [10, "AnnouncementThread"],
    [11, "PublicThread"],
    [12, "PrivateThread"],
    [13, "GuildStage"],
    [14, "GuildDirectory"],
    [15, "GuildForum"],
    [16, "GuildMedia"],
  ] as const)("decodes wire type %i as %s and omits the tag on encode", (type, tag) => {
    const wire = { id: "1", type };
    const channel = Schema.decodeSync(Channel)(wire);
    expect(channel._tag).toBe(tag);
    expect(Schema.encodeSync(Channel)(channel)).toEqual(wire);
  });

  test("roundtrips renamed keys and snowflakes", () => {
    const wire = {
      id: "1",
      type: 0,
      guild_id: "2",
      last_message_id: "3",
      rate_limit_per_user: 5,
    } as const;
    const channel = Schema.decodeSync(GuildTextChannel)(wire);
    expect(channel).toMatchObject({ guildId: 2n, lastMessageId: 3n, rateLimitPerUser: 5 });
    expect(Schema.encodeSync(GuildTextChannel)(channel)).toEqual(wire);
  });

  test("does not reinterpret malformed known channels as unknown", () => {
    const malformed: unknown = { id: "1", type: 0, topic: 42 };
    const mismatched: unknown = { id: "1", type: 0, _tag: "DM" };
    expect(() => Schema.decodeUnknownSync(Channel)(malformed)).toThrow();
    expect(() => Schema.decodeUnknownSync(Channel)(mismatched)).toThrow();
  });

  test("preserves future channel fields while validating its integer discriminator", () => {
    const wire = { id: "1", type: 99, future_field: { enabled: true } };
    const channel = Schema.decodeSync(Channel)(wire);
    expect(channel._tag).toBe("Unknown");
    expect(Schema.encodeSync(Channel)(channel)).toEqual(wire);
    expect(Schema.is(UnknownChannelType)(99)).toBe(true);
    for (const type of [0, 16, 99.5, "99", NaN, Infinity]) {
      expect(Schema.is(UnknownChannelType)(type)).toBe(false);
    }
  });

  test("accepts obfuscated channels only through the gateway schema", () => {
    const wire = { id: "1", type: 0, flags: 1 << 17, guild_id: "2" };
    const channel = Schema.decodeSync(GatewayChannel)(wire);
    expect(channel._tag).toBe("Obfuscated");
    expect(Schema.encodeSync(GatewayChannel)(channel)).toEqual(wire);
    expect(() => Schema.decodeSync(Channel)(wire)).toThrow();
  });
});
