import { describe, expect, expectTypeOf, test } from "bun:test";
import { Schema } from "effect";
import { Channel, ChannelId, ThreadMetadata } from "@/model/channel";
import { ChannelId as ChannelIdLeaf } from "@/model/channel/id";
import { Guild } from "@/model/guild";
import { Message, MessageApplication, SharedClientTheme } from "@/model/message";
import { Reaction } from "@/model/reaction";
import { Sticker, StickerItem } from "@/model/sticker";
import { WebhookId } from "@/model/webhook";
import { WebhookId as MessageWebhookId } from "@/model/message";
import { Activity } from "@/model/presence";

const userWire = {
  id: "53908099506183680",
  username: "Mason",
  discriminator: "9999",
  global_name: null,
  avatar: null,
} as const;

const roleWire = {
  id: "41771983423143936",
  name: "WE DEM BOYZZ!!!!!!",
  color: 3447003,
  colors: {
    primary_color: 3447003,
    secondary_color: null,
    tertiary_color: null,
  },
  hoist: true,
  managed: false,
  mentionable: false,
  position: 1,
  permissions: "66321471",
  flags: 0,
} as const;

const emojiWire = { id: "456", name: "party" } as const;

const stickerWire = {
  id: "789",
  name: "Hello",
  description: null,
  tags: "hello",
  type: 2,
  format_type: 1,
} as const;

describe("cross-domain integration", () => {
  test("guild decodes nested roles, emojis, and stickers", () => {
    const wire = {
      id: "1",
      name: "Guild",
      icon: null,
      splash: null,
      discovery_splash: null,
      owner_id: "2",
      afk_channel_id: null,
      afk_timeout: 300,
      verification_level: 0,
      default_message_notifications: 0,
      explicit_content_filter: 0,
      roles: [roleWire],
      emojis: [emojiWire],
      features: [],
      mfa_level: 0,
      application_id: null,
      system_channel_id: null,
      system_channel_flags: 0,
      rules_channel_id: null,
      vanity_url_code: null,
      description: null,
      banner: null,
      premium_tier: 0,
      preferred_locale: "en-US",
      public_updates_channel_id: null,
      nsfw_level: 0,
      stickers: [stickerWire],
      premium_progress_bar_enabled: false,
      safety_alerts_channel_id: null,
      incidents_data: null,
    } as const;
    const guild = Schema.decodeSync(Guild)(wire);
    expect(guild.roles[0]?.name).toBe("WE DEM BOYZZ!!!!!!");
    expect(guild.emojis[0]?.name).toBe("party");
    expect(guild.stickers?.[0]?.name).toBe("Hello");
    expect(Schema.encodeSync(Guild)(guild)).toEqual(wire);
    expectTypeOf<Guild["roles"][number]["id"]>().toEqualTypeOf<Guild["roles"][number]["id"]>();
  });

  test("thread channels carry structured metadata and DMs carry users", () => {
    const threadWire = {
      id: "10",
      type: 11,
      guild_id: "1",
      thread_metadata: {
        archived: false,
        auto_archive_duration: 1440,
        archive_timestamp: "2024-01-02T03:04:05.000Z",
        locked: false,
      },
    } as const;
    const thread = Schema.decodeSync(Channel)(threadWire);
    expect(thread._tag).toBe("PublicThread");
    if (thread._tag === "PublicThread") {
      expect(thread.threadMetadata?.archived).toBe(false);
    }
    expect(Schema.encodeSync(Channel)(thread)).toEqual(threadWire);
    expectTypeOf<ThreadMetadata>().not.toEqualTypeOf<unknown>();

    const dmWire = { id: "11", type: 1, recipients: [userWire] } as const;
    const dm = Schema.decodeSync(Channel)(dmWire);
    if (dm._tag === "DM") {
      expect(dm.recipients?.[0]?.username).toBe("Mason");
    } else {
      throw new Error("Expected DM");
    }
    expect(Schema.encodeSync(Channel)(dm)).toEqual(dmWire);
  });

  test("messages carry reactions, sticker items, and application partials", () => {
    const wire = {
      id: "100",
      channel_id: "290926798999357250",
      author: userWire,
      content: "Supa Hot",
      timestamp: "2017-07-11T17:27:07.299Z",
      edited_timestamp: null,
      tts: false,
      mention_everyone: false,
      mentions: [],
      mention_roles: [],
      attachments: [],
      embeds: [],
      reactions: [
        {
          count: 1,
          count_details: { burst: 0, normal: 1 },
          me: false,
          me_burst: false,
          emoji: { id: null, name: "🔥" },
          burst_colors: [],
        },
      ],
      pinned: false,
      type: 0,
      application: { id: "172150183260323840", name: "Baba O-Riley" },
      sticker_items: [{ id: "789", name: "Hello", format_type: 1 }],
      shared_client_theme: {
        colors: ["5865F2"],
        gradient_angle: 0,
        base_mix: 58,
        base_theme: 1,
      },
    } as const;
    const message = Schema.decodeSync(Message)(wire);
    expect(message.reactions?.[0]?.emoji).toEqual({ id: null, name: "🔥" });
    expect(message.stickerItems?.[0]?.name).toBe("Hello");
    expect(message.application?.name).toBe("Baba O-Riley");
    expect(message.sharedClientTheme?.baseMix).toBe(58);
    expect(Schema.encodeSync(Message)(message)).toEqual(wire);
    expectTypeOf<NonNullable<Message["reactions"]>[number]>().toEqualTypeOf<Reaction>();
    expectTypeOf<NonNullable<Message["stickerItems"]>[number]>().toEqualTypeOf<StickerItem>();
    expectTypeOf<Message["application"]>().toEqualTypeOf<MessageApplication | undefined>();
    expectTypeOf<Message["sharedClientTheme"]>().toEqualTypeOf<SharedClientTheme | undefined>();
  });

  test("clip attachments carry participants and application partials", () => {
    const wire = {
      id: "200",
      channel_id: "290926798999357250",
      author: userWire,
      content: "",
      timestamp: "2017-07-11T17:27:07.299Z",
      edited_timestamp: null,
      tts: false,
      mention_everyone: false,
      mentions: [],
      mention_roles: [],
      attachments: [
        {
          id: "201",
          filename: "clip.mp4",
          size: 42,
          url: "https://example.com/clip.mp4",
          proxy_url: "https://example.com/proxy.mp4",
          clip_participants: [userWire],
          clip_created_at: "2024-01-02T03:04:05.000Z",
          application: { id: "172150183260323840" },
        },
      ],
      embeds: [],
      pinned: false,
      type: 0,
    } as const;
    const message = Schema.decodeSync(Message)(wire);
    expect(message.attachments[0]?.clipParticipants?.[0]?.username).toBe("Mason");
    expect(Schema.encodeSync(Message)(message)).toEqual(wire);
  });

  test("shared identifier brands are identical across barrels", () => {
    expectTypeOf<MessageWebhookId>().toEqualTypeOf<WebhookId>();
    expectTypeOf<ChannelId>().toEqualTypeOf<ChannelIdLeaf>();
    expectTypeOf<Sticker>().not.toEqualTypeOf<StickerItem>();
  });

  test("presence activities reference real application ids", () => {
    const wire = { name: "Game", type: 0, created_at: 1, application_id: "3" } as const;
    const activity = Schema.decodeSync(Activity)(wire);
    expect(activity.applicationId?.toString()).toBe("3");
    expect(Schema.encodeSync(Activity)(activity)).toEqual(wire);
  });
});
