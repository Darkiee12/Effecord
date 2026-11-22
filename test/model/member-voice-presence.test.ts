import { describe, expect, expectTypeOf, test } from "bun:test";
import { Schema, type DateTime } from "effect";
import type { ChannelId } from "@/model/channel/channel";
import type { UserId } from "@/model/user/user";
import {
  GatewayGuildMember,
  GuildMember,
  GuildMemberBitSet,
  GuildMemberFlags,
} from "@/model/guild/member";
import { VoiceRegion, VoiceState, type VoiceRegionId } from "@/model/voice";
import {
  Activity,
  ActivityBitSet,
  ActivityFlags,
  ActivityType,
  ClientStatus,
  Presence,
  PresenceStatus,
} from "@/model/presence";

const exampleUser = {
  id: "80351110224678912",
  username: "Mason",
  discriminator: "9999",
  global_name: null,
  avatar: "a_bab14f271d565501444b2ca3be944b25",
};

const exampleMember = {
  user: exampleUser,
  nick: "NOT API SUPPORT",
  avatar: null,
  banner: null,
  roles: ["41771983423143937"],
  joined_at: "2015-04-26T06:26:56.936Z",
  premium_since: "2021-01-01T00:00:00.000Z",
  deaf: false,
  mute: false,
  flags: 3,
  pending: false,
  permissions: "66321471",
  communication_disabled_until: "2021-04-02T18:45:31.297Z",
  avatar_decoration_data: null,
  collectibles: null,
};

const minimalMember = {
  roles: [],
  joined_at: "2020-01-01T00:00:00.000Z",
  deaf: false,
  mute: false,
  flags: 0,
};

describe("guild member model", () => {
  test("decodes a full REST member and encodes the same wire payload", () => {
    const member = Schema.decodeSync(GuildMember)(exampleMember);
    expect(member.user?.id.toString()).toBe("80351110224678912");
    expect(member.nick).toBe("NOT API SUPPORT");
    expect(member.roles.map((role) => role.toString())).toEqual(["41771983423143937"]);
    expect(member.joinedAt).not.toBeNull();
    expect(member.premiumSince).not.toBeNull();
    expect(member.communicationDisabledUntil).not.toBeNull();
    expect(member.flags).toBeInstanceOf(GuildMemberBitSet);
    expect(member.flags.has("DidRejoin")).toBe(true);
    expect(member.flags.has("CompletedOnboarding")).toBe(true);
    expect(member.flags.has("BypassesVerification")).toBe(false);
    expect(member.permissions?.bits).toBe(66321471n);
    expect(member.avatarDecorationData).toBeNull();
    expect(member.collectibles).toBeNull();
    expect(Schema.encodeSync(GuildMember)(member)).toEqual(exampleMember);
  });

  test("distinguishes omitted vs null vs present optional fields", () => {
    const omitted = Schema.decodeSync(GuildMember)(minimalMember);
    expect(Object.hasOwn(omitted, "user")).toBe(false);
    expect(Object.hasOwn(omitted, "nick")).toBe(false);
    expect(Object.hasOwn(omitted, "premiumSince")).toBe(false);
    expect(Object.hasOwn(omitted, "pending")).toBe(false);
    expect(Schema.encodeSync(GuildMember)(omitted)).toEqual(minimalMember);

    const nulled = Schema.decodeSync(GuildMember)({
      ...minimalMember,
      nick: null,
      premium_since: null,
    });
    expect(Object.hasOwn(nulled, "nick")).toBe(true);
    expect(nulled.nick).toBeNull();
    expect(Schema.encodeSync(GuildMember)(nulled)).toEqual({
      ...minimalMember,
      nick: null,
      premium_since: null,
    });
    expectTypeOf<GuildMember["nick"]>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<GuildMember["pending"]>().toEqualTypeOf<boolean | undefined>();
  });

  test("keeps joined_at required-nullable in REST but optional in the gateway variant", () => {
    const { joined_at: _absent, ...noJoinedAt } = minimalMember;
    expect(() => Schema.decodeUnknownSync(GuildMember)(noJoinedAt)).toThrow();
    const guest = Schema.decodeSync(GuildMember)({ ...minimalMember, joined_at: null });
    expect(guest.joinedAt).toBeNull();
    expectTypeOf<GuildMember["joinedAt"]>().toEqualTypeOf<DateTime.Utc | null>();

    const noJoinedGateway = { roles: [], deaf: false, mute: false, flags: 0 };
    const absent = Schema.decodeSync(GatewayGuildMember)(noJoinedGateway);
    expect(Object.hasOwn(absent, "joinedAt")).toBe(false);
    expect(Schema.encodeSync(GatewayGuildMember)(absent)).toEqual(noJoinedGateway);
    expectTypeOf<GatewayGuildMember["joinedAt"]>().toEqualTypeOf<DateTime.Utc | null | undefined>();
  });

  test("preserves unknown member flag bits through the BitSet", () => {
    const wire = { ...minimalMember, flags: (1 << 10) | (1 << 20) };
    const member = Schema.decodeSync(GuildMember)(wire);
    expect(member.flags).toBeInstanceOf(GuildMemberBitSet);
    expect(member.flags.bits).toBe(1049600n);
    expect(member.flags.has("AutomodQuarantinedGuildTag")).toBe(true);
    expect(member.flags.toArray()).toEqual(["AutomodQuarantinedGuildTag"]);
    expect(Schema.encodeSync(GuildMember)(member)).toEqual(wire);
    expect(Schema.encodeSync(GuildMemberFlags)(member.flags)).toBe(1049600);
  });

  test("rejects malformed member fields", () => {
    for (const wire of [
      { ...minimalMember, roles: ["not-a-snowflake"] },
      { ...minimalMember, roles: "41771983423143937" },
      { ...minimalMember, deaf: "false" },
      { ...minimalMember, flags: "1" },
      { ...minimalMember, joined_at: "not-a-date" },
      { ...minimalMember, pending: "false" },
      { ...minimalMember, permissions: "1.5" },
    ]) {
      expect(() => Schema.decodeUnknownSync(GuildMember)(wire)).toThrow();
    }
  });
});

const exampleVoiceState = {
  guild_id: "197038439483310086",
  channel_id: "157733188964188161",
  user_id: "80351110224678912",
  member: exampleMember,
  session_id: "90326bd25d71d39b9ef95b299e3872ff",
  deaf: false,
  mute: false,
  self_deaf: false,
  self_mute: true,
  self_stream: true,
  self_video: false,
  suppress: false,
  request_to_speak_timestamp: null,
};

describe("voice state model", () => {
  test("round-trips a full voice state including nested member", () => {
    const state = Schema.decodeSync(VoiceState)(exampleVoiceState);
    expect(state.guildId?.toString()).toBe("197038439483310086");
    expect(state.channelId?.toString()).toBe("157733188964188161");
    expect(state.userId.toString()).toBe("80351110224678912");
    expect(state.member?.nick).toBe("NOT API SUPPORT");
    expect(state.sessionId).toBe("90326bd25d71d39b9ef95b299e3872ff");
    expect(state.selfMute).toBe(true);
    expect(state.requestToSpeakTimestamp).toBeNull();
    expect(Schema.encodeSync(VoiceState)(state)).toEqual(exampleVoiceState);
    expectTypeOf<VoiceState["channelId"]>().toEqualTypeOf<ChannelId | null | undefined>();
    expectTypeOf<VoiceState["userId"]>().toEqualTypeOf<UserId>();
  });

  test("tolerates absent guild, channel, member, and request timestamp", () => {
    const wire = {
      channel_id: null,
      user_id: "80351110224678912",
      session_id: "90326bd25d71d39b9ef95b299e3872ff",
      deaf: false,
      mute: false,
      self_deaf: false,
      self_mute: false,
      self_video: false,
      suppress: false,
    };
    const state = Schema.decodeSync(VoiceState)(wire);
    expect(Object.hasOwn(state, "guildId")).toBe(false);
    expect(Object.hasOwn(state, "member")).toBe(false);
    expect(Object.hasOwn(state, "selfStream")).toBe(false);
    expect(state.channelId).toBeNull();
    expect(Schema.encodeSync(VoiceState)(state)).toEqual(wire);

    const omitted = Schema.decodeSync(VoiceState)({
      user_id: "1",
      session_id: "90326bd25d71d39b9ef95b299e3872ff",
      deaf: false,
      mute: false,
      self_deaf: false,
      self_mute: false,
      self_video: false,
      suppress: false,
    });
    expect(Object.hasOwn(omitted, "channelId")).toBe(false);
  });

  test("decodes a voice region with a branded string id", () => {
    const wire = {
      id: "us-west",
      name: "US West",
      optimal: true,
      deprecated: false,
      custom: false,
    };
    const region = Schema.decodeSync(VoiceRegion)(wire);
    expect(region.id === "us-west").toBe(true);
    expect(Schema.encodeSync(VoiceRegion)(region)).toEqual(wire);
    expectTypeOf<VoiceRegion["id"]>().toEqualTypeOf<VoiceRegionId>();
  });

  test("rejects malformed voice states", () => {
    for (const wire of [
      { ...exampleVoiceState, user_id: undefined },
      { ...exampleVoiceState, session_id: 42 },
      { ...exampleVoiceState, channel_id: 123 },
      { ...exampleVoiceState, member: {} },
      { ...exampleVoiceState, self_stream: "true" },
    ]) {
      expect(() => Schema.decodeUnknownSync(VoiceState)(wire)).toThrow();
    }
  });
});

const richActivity = {
  name: "Rocket League",
  type: 0,
  created_at: 15112000660000,
  application_id: "379286085710381999",
  status_display_type: 2,
  details: "Ranked Duos: 2-1",
  state: "In a Match",
  timestamps: { start: 15112000660000 },
  party: { id: "9dd6594e-81b3-49f6-a6b5-a679e6a060d3", size: [2, 2] },
  assets: {
    large_image: "351371005538729000",
    large_text: "DFH Stadium",
    small_image: "351371005538729111",
    small_text: "Silver III",
  },
  secrets: { join: "025ed05c71f639de8bfaa0d679d7c94b2fdce12f" },
  instance: true,
  flags: 3,
  buttons: ["Join", "Spectate"],
} as const;

const examplePresence = {
  user: exampleUser,
  guild_id: "197038439483310086",
  status: "online",
  activities: [richActivity],
  client_status: { desktop: "online" },
} as const;

describe("presence model", () => {
  test("round-trips a rich presence payload", () => {
    const presence = Schema.decodeSync(Presence)(examplePresence);
    expect(presence.user.id.toString()).toBe("80351110224678912");
    expect(presence.guildId?.toString()).toBe("197038439483310086");
    expect(presence.status).toBe("online");
    expect(presence.activities).toHaveLength(1);
    expect(presence.activities[0]?.type).toBe(ActivityType.enums.Playing);
    expect(presence.clientStatus).toEqual({ desktop: "online" });
    expect(Schema.encodeSync(Presence)(presence)).toEqual(examplePresence);
    expectTypeOf<Presence["status"]>().toEqualTypeOf<PresenceStatus>();
    expectTypeOf<PresenceStatus>().toEqualTypeOf<
      "online" | "idle" | "dnd" | "invisible" | "offline"
    >();
    expectTypeOf<Activity["createdAt"]>().toEqualTypeOf<number>();
  });

  test("accepts every documented status and client platform", () => {
    for (const status of ["online", "idle", "dnd", "invisible", "offline"] as const) {
      expect(Schema.decodeSync(Presence)({ ...examplePresence, status }).status).toBe(status);
    }
    const multi = Schema.decodeSync(ClientStatus)({
      desktop: "idle",
      mobile: "dnd",
      web: "online",
    });
    expect(multi).toEqual({ desktop: "idle", mobile: "dnd", web: "online" });
    expect(Schema.decodeSync(ClientStatus)({})).toEqual({});
    expect(() =>
      Schema.decodeUnknownSync(Presence)({ ...examplePresence, status: "away" }),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(ClientStatus)({ desktop: "away" })).toThrow();
  });

  test("accepts a partial presence user with only an id", () => {
    const { guild_id: _absent, ...noGuild } = examplePresence;
    const presence = Schema.decodeSync(Presence)({
      ...noGuild,
      user: { id: "80351110224678912" },
    });
    expect(presence.user.id.toString()).toBe("80351110224678912");
    expect(Object.hasOwn(presence.user, "username")).toBe(false);
    expect(Object.hasOwn(presence, "guildId")).toBe(false);
  });

  test("decodes each documented activity type and rejects undocumented ones", () => {
    for (const type of [0, 1, 2, 3, 4, 5] as const) {
      const activity = Schema.decodeSync(Activity)({ name: "x", type, created_at: 1 });
      expect(activity.type).toBe(type);
    }
    expect(ActivityType.enums.Competing).toBe(5);
    for (const type of [6, -1, "1", null]) {
      expect(() =>
        Schema.decodeUnknownSync(Activity)({ name: "x", type, created_at: 1 }),
      ).toThrow();
    }
  });

  test("round-trips custom status and streaming activities", () => {
    const custom = {
      name: "Custom Status",
      type: 4,
      created_at: 1680000000000,
      state: "I am cool",
      emoji: { name: "😀", id: null, animated: false },
    } as const;
    const decoded = Schema.decodeSync(Activity)(custom);
    expect(decoded.emoji?.name).toBe("😀");
    expect(Schema.encodeSync(Activity)(decoded)).toEqual(custom);

    const stream = {
      name: "Twitch",
      type: 1,
      url: "https://www.twitch.tv/discord",
      created_at: 1680000000000,
      details: "24H RL Stream for Charity",
      state: "Rocket League",
    } as const;
    expect(Schema.encodeSync(Activity)(Schema.decodeSync(Activity)(stream))).toEqual(stream);
  });

  test("preserves unknown activity flag bits and rejects send-shaped buttons", () => {
    const activity = Schema.decodeSync(Activity)({
      name: "x",
      type: 0,
      created_at: 1,
      flags: 4099,
    });
    expect(activity.flags).toBeInstanceOf(ActivityBitSet);
    expect(activity.flags?.bits).toBe(4099n);
    expect(activity.flags?.has("Instance")).toBe(true);
    expect(activity.flags?.has("Join")).toBe(true);
    expect(Schema.encodeSync(ActivityFlags)(activity.flags!)).toBe(4099);

    expect(() =>
      Schema.decodeUnknownSync(Activity)({
        name: "x",
        type: 0,
        created_at: 1,
        buttons: [{ label: "Join", url: "https://example.com" }],
      }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(Activity)({
        name: "x",
        type: 0,
        created_at: 1,
        buttons: ["a", "b", "c"],
      }),
    ).toThrow();
  });

  test("rejects malformed presence payloads", () => {
    for (const wire of [
      { ...examplePresence, user: { username: "noid" } },
      { ...examplePresence, activities: {} },
      { ...examplePresence, activities: [{ name: "x", type: 0 }] },
      { ...examplePresence, client_status: { desktop: null } },
      { ...examplePresence, status: "ONLINE" },
    ]) {
      expect(() => Schema.decodeUnknownSync(Presence)(wire)).toThrow();
    }
  });
});
