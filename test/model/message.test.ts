import { describe, expect, expectTypeOf, test } from "bun:test";
import { DateTime, Schema } from "effect";
import { MessageId as ChannelMessageId } from "@/model/channel/message";
import { ChannelId } from "@/model/channel/channel";
import { UserId } from "@/model/user";
import {
  AllowedMentions,
  Attachment,
  AttachmentFlags,
  Embed,
  EmbedType,
  Message,
  MessageActivity,
  MessageCall,
  MessageFlags,
  MessageId,
  MessageReference,
  MessageSnapshot,
  MessageType,
  MentionChannel,
  Poll,
  RoleSubscriptionData,
} from "@/model/message";

const authorWire = {
  id: "53908099506183680",
  username: "Mason",
  discriminator: "9999",
  global_name: null,
  avatar: "a_bab14f271d565501444b2ca3be944b25",
};

const minimalMessageWire = {
  id: "334385199974967042",
  channel_id: "290926798999357250",
  author: authorWire,
  content: "Supa Hot",
  timestamp: "2017-07-11T17:27:07.299Z",
  edited_timestamp: null,
  tts: false,
  mention_everyone: false,
  mentions: [],
  mention_roles: [],
  attachments: [],
  embeds: [],
  pinned: false,
  type: 0,
} as const;

describe("message domain imports", () => {
  test("reuses the canonical MessageId brand from the channel domain", () => {
    expect(MessageId).toBe(ChannelMessageId);
    const message = Schema.decodeSync(Message)(minimalMessageWire);
    expectTypeOf(message.id).toEqualTypeOf<MessageId>();
    expectTypeOf(message.id).toEqualTypeOf<ChannelMessageId>();
    expect(message.id.toString()).toBe("334385199974967042");
    expectTypeOf(message.channelId).toEqualTypeOf<ChannelId>();
    expectTypeOf(message.mentions).toEqualTypeOf<
      ReadonlyArray<{
        readonly id: UserId;
        readonly username: string;
      }> extends never
        ? never
        : typeof message.mentions
    >();
  });
});

describe("message flags", () => {
  test("roundtrips wire numbers and exposes named bits", () => {
    const flags = Schema.decodeSync(MessageFlags)(32768);
    expect(flags.has("IsComponentsV2")).toBe(true);
    expect(flags.has("Ephemeral")).toBe(false);
    expect(flags.toArray()).toEqual(["IsComponentsV2"]);
    expect(Schema.encodeSync(MessageFlags)(flags)).toBe(32768);

    const combined = Schema.decodeSync(MessageFlags)((1 << 6) | (1 << 12));
    expect(combined.all(["Ephemeral", "SuppressNotifications"])).toBe(true);
    expect(combined.missing(["Ephemeral", "Loading"])).toEqual(["Loading"]);
    expectTypeOf<MessageFlags["bits"]>().toEqualTypeOf<bigint>();
  });

  test("rejects negative and non-integer flag values", () => {
    for (const wire of [-1, 1.5, "32768", null, NaN]) {
      expect(() => Schema.decodeUnknownSync(MessageFlags)(wire)).toThrow();
    }
  });
});

describe("message types", () => {
  test("keeps documented numeric values", () => {
    expect(MessageType.enums.Default).toBe(0);
    expect(MessageType.enums.Reply).toBe(19);
    expect(MessageType.enums.ThreadStarterMessage).toBe(21);
    expect(MessageType.enums.ContextMenuCommand).toBe(23);
    expect(MessageType.enums.PollResult).toBe(46);
    expectTypeOf<MessageType>().toEqualTypeOf<
      | 0
      | 1
      | 2
      | 3
      | 4
      | 5
      | 6
      | 7
      | 8
      | 9
      | 10
      | 11
      | 12
      | 14
      | 15
      | 16
      | 17
      | 18
      | 19
      | 20
      | 21
      | 22
      | 23
      | 24
      | 25
      | 26
      | 27
      | 28
      | 29
      | 31
      | 32
      | 36
      | 37
      | 38
      | 39
      | 44
      | 46
    >();
  });

  test("rejects unassigned and malformed type values", () => {
    for (const wire of [13, 30, 33, 40, 45, 47, -1, 1.5, "0", null]) {
      expect(() => Schema.decodeUnknownSync(MessageType)(wire)).toThrow();
    }
  });
});

describe("attachments", () => {
  test("roundtrips a voice-message attachment with flags", () => {
    const wire = {
      id: "111",
      filename: "voice-message.ogg",
      description: "voice message",
      content_type: "audio/ogg",
      size: 1024,
      url: "https://cdn.discordapp.com/attachments/1/111/voice-message.ogg",
      proxy_url: "https://media.discordapp.net/attachments/1/111/voice-message.ogg",
      height: null,
      width: null,
      duration_secs: 12.5,
      waveform: "aGVsbG8=",
      flags: (1 << 3) | (1 << 5),
    } as const;
    const attachment = Schema.decodeSync(Attachment)(wire);
    expect(attachment.filename).toBe("voice-message.ogg");
    expect(attachment.height).toBeNull();
    expect(attachment.flags?.has("IsSpoiler")).toBe(true);
    expect(attachment.flags?.has("IsAnimated")).toBe(true);
    expect(Schema.encodeSync(Attachment)(attachment)).toEqual(wire);
    expectTypeOf<Attachment["durationSecs"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<NonNullable<Attachment["flags"]>>().toEqualTypeOf<AttachmentFlags>();
  });

  test("accepts a minimal image attachment and rejects bad payloads", () => {
    const wire = {
      id: "222",
      filename: "spot.png",
      size: 42,
      url: "https://cdn.discordapp.com/spot.png",
      proxy_url: "https://media.discordapp.net/spot.png",
    } as const;
    expect(Schema.encodeSync(Attachment)(Schema.decodeSync(Attachment)(wire))).toEqual(wire);
    expect(() => Schema.decodeUnknownSync(Attachment)({ ...wire, size: "42" })).toThrow();
    expect(() => Schema.decodeUnknownSync(Attachment)({ ...wire, id: undefined })).toThrow();
    expect(() => Schema.decodeSync(Attachment)({ ...wire, flags: -1 })).toThrow();
  });
});

describe("embeds", () => {
  test("roundtrips a rich embed with nested objects", () => {
    const wire = {
      title: "Title",
      type: "rich",
      description: "Description",
      url: "https://example.com",
      timestamp: "2024-01-02T03:04:05.000Z",
      color: 5814783,
      footer: { text: "Footer", icon_url: "https://example.com/icon.png" },
      image: { url: "https://example.com/image.png", width: 100, height: 200 },
      thumbnail: { url: "https://example.com/thumb.png" },
      video: { url: "https://example.com/video.mp4" },
      provider: { name: "Example", url: "https://example.com" },
      author: { name: "Author", url: "https://example.com/author" },
      fields: [
        { name: "a", value: "b", inline: true },
        { name: "c", value: "d" },
      ],
      flags: 1 << 4,
    } as const;
    const embed = Schema.decodeSync(Embed)(wire);
    expect(embed.type).toBe("rich");
    expect(DateTime.toEpochMillis(embed.timestamp!)).toBe(1704164645000);
    expect(embed.fields?.length).toBe(2);
    expect(embed.flags?.has("ContainsExplicitContent")).toBe(true);
    expect(Schema.encodeSync(Embed)(embed)).toEqual(wire);
    expectTypeOf<Embed["type"]>().toEqualTypeOf<EmbedType | undefined>();
    expectTypeOf<Embed["timestamp"]>().toEqualTypeOf<DateTime.Utc | undefined>();
  });

  test("rejects unknown embed types and oversized field lists", () => {
    expect(() => Schema.decodeUnknownSync(Embed)({ type: "future" })).toThrow();
    const fields = Array.from({ length: 26 }, (_, i) => ({ name: `n${i}`, value: "v" }));
    expect(() => Schema.decodeSync(Embed)({ fields })).toThrow();
    expect(() =>
      Schema.encodeSync(Embed)(Schema.decodeSync(Embed)({ fields: fields.slice(0, 25) })),
    ).not.toThrow();
  });
});

describe("allowed mentions", () => {
  test("roundtrips parse and explicit ID lists", () => {
    const wire = { parse: ["users"], roles: ["123"], users: ["456"], replied_user: false } as const;
    const mentions = Schema.decodeSync(AllowedMentions)(wire);
    expect(mentions.users?.[0]?.toString()).toBe("456");
    expect(Schema.encodeSync(AllowedMentions)(mentions)).toEqual(wire);
    expect(() => Schema.decodeUnknownSync(AllowedMentions)({ parse: ["bots"] })).toThrow();
  });
});

describe("polls", () => {
  test("roundtrips a finalized poll with counts", () => {
    const wire = {
      question: { text: "Favorite bug?" },
      answers: [
        { answer_id: 1, poll_media: { text: "Ant", emoji: { name: "🐜" } } },
        { answer_id: 2, poll_media: { text: "Butterfly" } },
      ],
      expiry: "2024-02-01T00:00:00.000Z",
      allow_multiselect: false,
      layout_type: 1,
      results: {
        is_finalized: true,
        answer_counts: [{ id: 1, count: 3, me_voted: true }],
      },
    } as const;
    const poll = Schema.decodeSync(Poll)(wire);
    expect(poll.answers[1]?.pollMedia.text).toBe("Butterfly");
    expect(poll.results?.answerCounts[0]?.count).toBe(3);
    expect(Schema.encodeSync(Poll)(poll)).toEqual(wire);
  });

  test("accepts a null expiry for future non-expiring polls", () => {
    const wire = {
      question: { text: "Q?" },
      answers: [],
      expiry: null,
      allow_multiselect: true,
      layout_type: 1,
    } as const;
    expect(Schema.encodeSync(Poll)(Schema.decodeSync(Poll)(wire))).toEqual(wire);
    expect(() => Schema.decodeUnknownSync(Poll)({ ...wire, layout_type: 2 })).toThrow();
  });
});

describe("references and snapshots", () => {
  test("roundtrips reply references and activity", () => {
    const wire = {
      message_id: "1",
      channel_id: "2",
      guild_id: "3",
      fail_if_not_exists: false,
    } as const;
    const reference = Schema.decodeSync(MessageReference)(wire);
    expect(reference.messageId?.toString()).toBe("1");
    expect(Schema.encodeSync(MessageReference)(reference)).toEqual(wire);

    const activity = Schema.decodeSync(MessageActivity)({ type: 6 });
    expect(activity.type).toBe(6);
    expect(() => Schema.decodeUnknownSync(MessageActivity)({ type: 4 })).toThrow();
  });

  test("roundtrips channel mentions", () => {
    const wire = { id: "1", guild_id: "2", type: 0, name: "general" } as const;
    expect(Schema.encodeSync(MentionChannel)(Schema.decodeSync(MentionChannel)(wire))).toEqual(
      wire,
    );
  });

  test("roundtrips nested snapshots (genuine recursion, depth 1)", () => {
    const inner = {
      type: 0,
      content: "original",
      embeds: [],
      attachments: [],
      timestamp: "2024-01-02T03:04:05.000Z",
      edited_timestamp: null,
      mentions: [],
      mention_roles: [],
    } as const;
    const wire = { message: { ...inner, message_snapshots: [{ message: inner }] } } as const;
    const snapshot = Schema.decodeSync(MessageSnapshot)(wire);
    expect(snapshot.message.messageSnapshots?.[0]?.message.content).toBe("original");
    expect(Schema.encodeSync(MessageSnapshot)(snapshot)).toEqual(wire);
    expectTypeOf(snapshot.message.content).toEqualTypeOf<string>();
  });
});

describe("message object", () => {
  test("decodes and encodes an official-like message", () => {
    const message = Schema.decodeSync(Message)(minimalMessageWire);
    expect(message.author.username).toBe("Mason");
    expect(message.editedTimestamp).toBeNull();
    expect(DateTime.isUtc(message.timestamp)).toBe(true);
    expect(message.mentionEveryone).toBe(false);
    expect(Schema.encodeSync(Message)(message)).toEqual(minimalMessageWire);
    expectTypeOf(message.type).toEqualTypeOf<MessageType>();
  });

  test("distinguishes absent, null, and present referenced messages", () => {
    const replyWire = {
      ...minimalMessageWire,
      type: 19,
      message_reference: { message_id: "1", channel_id: "2" },
      referenced_message: { ...minimalMessageWire, id: "1" },
    } as const;
    const reply = Schema.decodeSync(Message)(replyWire);
    expect(reply.referencedMessage?.content).toBe("Supa Hot");
    expect(Schema.encodeSync(Message)(reply)).toEqual(replyWire);

    const deletedWire = { ...replyWire, referenced_message: null } as const;
    expect(Schema.decodeSync(Message)(deletedWire).referencedMessage).toBeNull();
    expect(Schema.encodeSync(Message)(Schema.decodeSync(Message)(deletedWire))).toEqual(
      deletedWire,
    );

    const unattemptedWire = { ...minimalMessageWire, type: 19 } as const;
    expect(Schema.decodeSync(Message)(unattemptedWire).referencedMessage).toBeUndefined();
  });

  test("supports flags, nonce variants, call, and role subscription data", () => {
    const wire = {
      ...minimalMessageWire,
      nonce: "abc123",
      flags: 32768,
      call: { participants: ["9"], ended_timestamp: null },
      role_subscription_data: {
        role_subscription_listing_id: "7",
        tier_name: "Gold",
        total_months_subscribed: 3,
        is_renewal: true,
      },
    } as const;
    const message = Schema.decodeSync(Message)(wire);
    expect(message.flags?.has("IsComponentsV2")).toBe(true);
    expect(message.nonce).toBe("abc123");
    expect(message.call?.participants[0]?.toString()).toBe("9");
    expect(message.roleSubscriptionData?.tierName).toBe("Gold");
    expect(Schema.encodeSync(Message)(message)).toEqual(wire);

    const intNonce = Schema.decodeSync(Message)({ ...minimalMessageWire, nonce: 123 });
    expect(intNonce.nonce).toBe(123);
    expectTypeOf<NonNullable<Message["call"]>>().toEqualTypeOf<MessageCall>();
    expectTypeOf<
      NonNullable<Message["roleSubscriptionData"]>
    >().toEqualTypeOf<RoleSubscriptionData>();
  });

  test("rejects unknown message types and malformed payloads", () => {
    expect(() => Schema.decodeUnknownSync(Message)({ ...minimalMessageWire, type: 13 })).toThrow();
    expect(() =>
      Schema.decodeSync(Message)({ ...minimalMessageWire, edited_timestamp: "nope" }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(Message)({ ...minimalMessageWire, author: null }),
    ).toThrow();
  });
});
