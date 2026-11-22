import { describe, expect, expectTypeOf, test } from "bun:test";
import { Schema } from "effect";
import { AuditLog, AuditLogEntry, AuditLogEvent, OptionalAuditEntryInfo } from "@/model/audit-log";
import {
  AutoModerationActionType,
  AutoModerationEventType,
  AutoModerationRule,
  AutoModerationTriggerType,
  KeywordPresetType,
} from "@/model/automod";
import {
  GuildScheduledEvent,
  RecurrenceFrequency,
  RecurrenceMonth,
  RecurrenceWeekday,
  ScheduledEventEntityType,
  ScheduledEventPrivacyLevel,
  ScheduledEventStatus,
} from "@/model/scheduled-event";
import { StageInstance, StagePrivacyLevel } from "@/model/stage";
import { Entitlement, EntitlementType, Sku, SkuFlags, SkuType } from "@/model/entitlement";
import { GuildOnboarding, OnboardingMode, OnboardingPromptType } from "@/model/guild/onboarding";
import { SoundboardSound } from "@/model/guild/soundboard";
import { GuildTemplate } from "@/model/guild/template";

describe("audit log resource", () => {
  const entryWire: typeof AuditLogEntry.Encoded = {
    target_id: "5618852344134324",
    changes: [
      { key: "name", old_value: "old", new_value: "new" },
      { key: "permissions", new_value: ["1", "2"] },
    ],
    user_id: "190320984123768832",
    id: "144463106609213442",
    action_type: 11,
    options: { channel_id: "5618852344134324", count: "3" },
    reason: "cleanup",
  };

  test("decodes entries with heterogeneous change values", () => {
    const entry = Schema.decodeSync(AuditLogEntry)(entryWire);
    expect(entry.actionType).toBe(AuditLogEvent.enums.ChannelUpdate);
    expect(entry.changes).toHaveLength(2);
    expect(Schema.encodeSync(AuditLogEntry)(entry)).toEqual(entryWire);
    expect(AuditLogEvent.enums.GuildUpdate).toBe(1);
    expect(AuditLogEvent.enums.VoiceChannelStatusDelete).toBe(193);
  });

  test("rejects unknown action types and requires entry id", () => {
    expect(() =>
      Schema.decodeUnknownSync(AuditLogEntry)({ ...entryWire, action_type: 999 }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(AuditLogEntry)({ ...entryWire, id: undefined }),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(OptionalAuditEntryInfo)({ count: 3 })).toThrow();
  });

  test("roundtrips an audit log with entries", () => {
    const wire: typeof AuditLog.Encoded = {
      audit_log_entries: [entryWire],
      users: [],
      integrations: [
        {
          id: "33590653072239123",
          name: "A Name",
          type: "twitch",
          account: { name: "twitchusername", id: "1234567" },
          application_id: "94651234501213162",
        },
      ],
    };
    const log = Schema.decodeSync(AuditLog)(wire);
    expect(log.auditLogEntries).toHaveLength(1);
    expect(log.integrations?.[0]?.account.name).toBe("twitchusername");
    expect(Schema.encodeSync(AuditLog)(log)).toEqual(wire);
  });
});

describe("auto moderation resource", () => {
  const wire: typeof AutoModerationRule.Encoded = {
    id: "969707018069872670",
    guild_id: "613425648685547541",
    name: "Keyword Filter 1",
    creator_id: "423457898095789043",
    trigger_type: 1,
    event_type: 1,
    actions: [
      { type: 1, metadata: { custom_message: "Keep it civil" } },
      { type: 2, metadata: { channel_id: "123456789123456789" } },
      { type: 3, metadata: { duration_seconds: 60 } },
    ],
    trigger_metadata: {
      keyword_filter: ["cat*", "*dog"],
      regex_patterns: ["(b|c)at"],
    },
    enabled: true,
    exempt_roles: ["323456789123456789"],
    exempt_channels: ["523456789123456789"],
  };

  test("decodes official-like rule and roundtrips", () => {
    const rule = Schema.decodeSync(AutoModerationRule)(wire);
    expect(rule.triggerType).toBe(AutoModerationTriggerType.enums.Keyword);
    expect(rule.eventType).toBe(AutoModerationEventType.enums.MessageSend);
    expect(Schema.encodeSync(AutoModerationRule)(rule)).toEqual(wire);
    expect(KeywordPresetType.enums.Slurs).toBe(3);
    expect(AutoModerationActionType.enums.BlockMemberInteraction).toBe(4);
  });

  test("rejects reserved trigger value 2 and invalid event", () => {
    expect(() =>
      Schema.decodeUnknownSync(AutoModerationRule)({ ...wire, trigger_type: 2 }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(AutoModerationRule)({ ...wire, event_type: 3 }),
    ).toThrow();
  });
});

describe("scheduled events and stage instances", () => {
  const eventWire: typeof GuildScheduledEvent.Encoded = {
    id: "947656305244532806",
    guild_id: "197038439483310086",
    channel_id: null,
    name: "External AMA",
    description: "Ask us anything",
    scheduled_start_time: "2024-01-02T03:04:05.000Z",
    scheduled_end_time: "2024-01-02T04:04:05.000Z",
    privacy_level: 2,
    status: 1,
    entity_type: 3,
    entity_id: null,
    entity_metadata: { location: "https://example.com/ama" },
    user_count: 42,
    recurrence_rule: {
      start: "2024-01-02T03:04:05.000Z",
      frequency: 2,
      interval: 2,
      by_weekday: [2],
    },
  };

  test("decodes external event with recurrence rule", () => {
    const event = Schema.decodeSync(GuildScheduledEvent)(eventWire);
    expect(event.privacyLevel).toBe(ScheduledEventPrivacyLevel.enums.GuildOnly);
    expect(event.status).toBe(ScheduledEventStatus.enums.Scheduled);
    expect(event.entityType).toBe(ScheduledEventEntityType.enums.External);
    expect(event.recurrenceRule?.frequency).toBe(RecurrenceFrequency.enums.Weekly);
    expect(Schema.encodeSync(GuildScheduledEvent)(event)).toEqual(eventWire);
    expect(RecurrenceWeekday.enums.Wednesday).toBe(2);
    expect(RecurrenceMonth.enums.July).toBe(7);
  });

  test("rejects invalid scheduled event enums", () => {
    expect(() =>
      Schema.decodeUnknownSync(GuildScheduledEvent)({ ...eventWire, status: 5 }),
    ).toThrow();
    expect(() =>
      Schema.decodeUnknownSync(GuildScheduledEvent)({ ...eventWire, privacy_level: 1 }),
    ).toThrow();
  });

  test("roundtrips a stage instance", () => {
    const wire: typeof StageInstance.Encoded = {
      id: "840647391636226060",
      guild_id: "197038439483310086",
      channel_id: "733488538393510049",
      topic: "Testing Testing, 123",
      privacy_level: 2,
      discoverable_disabled: false,
      guild_scheduled_event_id: "947656305244532806",
    };
    const stage = Schema.decodeSync(StageInstance)(wire);
    expect(stage.privacyLevel).toBe(StagePrivacyLevel.enums.GuildOnly);
    expect(Schema.encodeSync(StageInstance)(stage)).toEqual(wire);
    expectTypeOf<StageInstance["guildScheduledEventId"]>().toEqualTypeOf<
      import("@/model/scheduled-event").ScheduledEventId | null
    >();
  });
});

describe("entitlements and skus", () => {
  test("roundtrips an entitlement with nullable timestamps", () => {
    const wire: typeof Entitlement.Encoded = {
      id: "1019653849998299136",
      sku_id: "1019475255913222144",
      application_id: "1019370614521200640",
      user_id: "771129655544643584",
      type: 8,
      deleted: false,
      starts_at: "2024-01-02T03:04:05.000Z",
      ends_at: null,
      guild_id: "1015034326372454400",
    };
    const entitlement = Schema.decodeSync(Entitlement)(wire);
    expect(entitlement.type).toBe(EntitlementType.enums.ApplicationSubscription);
    expect(Schema.encodeSync(Entitlement)(entitlement)).toEqual(wire);
    expect(() => Schema.decodeUnknownSync(Entitlement)({ ...wire, type: 9 })).toThrow();
  });

  test("sku flags distinguish user and guild subscriptions", () => {
    const wire: typeof Sku.Encoded = {
      id: "1088510058284990888",
      type: 5,
      application_id: "788708323867885999",
      name: "Test Premium",
      slug: "test-premium",
      flags: 128,
    };
    const sku = Schema.decodeSync(Sku)(wire);
    expect(sku.type).toBe(SkuType.enums.Subscription);
    expect(sku.flags.has("GuildSubscription")).toBe(true);
    expect(sku.flags.has("UserSubscription")).toBe(false);
    expect(Schema.encodeSync(Sku)(sku)).toEqual(wire);
    expect(Schema.decodeSync(SkuFlags)(4).has("Available")).toBe(true);
    expect(() => Schema.decodeUnknownSync(Sku)({ ...wire, type: 4 })).toThrow();
  });
});

describe("guild onboarding, soundboard, and template", () => {
  test("decodes onboarding with option emoji read shape", () => {
    const wire: typeof GuildOnboarding.Encoded = {
      guild_id: "960007075288915998",
      prompts: [
        {
          id: "1067461047608422473",
          type: 0,
          options: [
            {
              id: "1067461047608422476",
              channel_ids: ["962007075288916001"],
              role_ids: [],
              emoji: { id: null, name: "😀", animated: false },
              title: "Chat with Friends",
              description: null,
            },
          ],
          title: "What do you want to do?",
          single_select: false,
          required: false,
          in_onboarding: true,
        },
      ],
      default_channel_ids: ["998678771706110023"],
      enabled: true,
      mode: 0,
    };
    const onboarding = Schema.decodeSync(GuildOnboarding)(wire);
    expect(onboarding.mode).toBe(OnboardingMode.enums.OnboardingDefault);
    expect(onboarding.prompts[0]?.type).toBe(OnboardingPromptType.enums.MultipleChoice);
    expect(Schema.encodeSync(GuildOnboarding)(onboarding)).toEqual(wire);
  });

  test("roundtrips guild soundboard sounds with unicode and custom emoji", () => {
    for (const emoji of [
      { emoji_id: null, emoji_name: "🦆" },
      { emoji_id: "989193655938064464", emoji_name: null },
    ]) {
      const wire = {
        name: "quack",
        sound_id: "1106714396018884649",
        volume: 1,
        ...emoji,
        guild_id: "613425648685547541",
        available: true,
      };
      expect(Schema.encodeSync(SoundboardSound)(Schema.decodeSync(SoundboardSound)(wire))).toEqual(
        wire,
      );
    }
    expect(() =>
      Schema.decodeUnknownSync(SoundboardSound)({
        name: "x",
        sound_id: "1",
        volume: 2,
        emoji_id: null,
        emoji_name: null,
        available: true,
      }),
    ).not.toThrow();
  });

  test("decodes template with code and unknown snapshot", () => {
    const wire: typeof GuildTemplate.Encoded = {
      code: "hgM48av5Q69A",
      name: "Friends & Family",
      description: "",
      usage_count: 49605,
      creator_id: "132837293881950208",
      creator: { id: "132837293881950208", username: "hoges" },
      created_at: "2020-04-02T21:10:38.000Z",
      updated_at: "2020-05-01T17:57:38.000Z",
      source_guild_id: "678070694164299796",
      serialized_source_guild: { name: "Friends & Family", roles: [] },
      is_dirty: null,
    };
    const template = Schema.decodeSync(GuildTemplate)(wire);
    expect(template.code).toBe("hgM48av5Q69A");
    expectTypeOf<GuildTemplate["code"]>().toEqualTypeOf<string>();
    expect(Schema.encodeSync(GuildTemplate)(template)).toEqual(wire);
  });
});
