import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { ChannelId } from "@/model/channel/channel";
import { UserId } from "@/model/user/user";
import { ScheduledEventId } from "./id";

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-privacy-level
export const ScheduledEventPrivacyLevel = Schema.Enum({
  GuildOnly: 2,
});
export type ScheduledEventPrivacyLevel = typeof ScheduledEventPrivacyLevel.Type;

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-entity-types
export const ScheduledEventEntityType = Schema.Enum({
  StageInstance: 1,
  Voice: 2,
  External: 3,
});
export type ScheduledEventEntityType = typeof ScheduledEventEntityType.Type;

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-status
export const ScheduledEventStatus = Schema.Enum({
  Scheduled: 1,
  Active: 2,
  Completed: 3,
  Canceled: 4,
});
export type ScheduledEventStatus = typeof ScheduledEventStatus.Type;

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-object-guild-scheduled-event-entity-metadata
export const ScheduledEventEntityMetadata = Schema.Struct({
  location: Schema.optionalKey(Schema.String),
});
export type ScheduledEventEntityMetadata = typeof ScheduledEventEntityMetadata.Type;

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-recurrence-rule-object-guild-scheduled-event-recurrence-rule-frequency
export const RecurrenceFrequency = Schema.Enum({
  Yearly: 0,
  Monthly: 1,
  Weekly: 2,
  Daily: 3,
});
export type RecurrenceFrequency = typeof RecurrenceFrequency.Type;

export const RecurrenceWeekday = Schema.Enum({
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
});
export type RecurrenceWeekday = typeof RecurrenceWeekday.Type;

export const RecurrenceMonth = Schema.Enum({
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
});
export type RecurrenceMonth = typeof RecurrenceMonth.Type;

export const RecurrenceNWeekday = Schema.Struct({
  n: Schema.Int,
  day: RecurrenceWeekday,
});
export type RecurrenceNWeekday = typeof RecurrenceNWeekday.Type;

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-recurrence-rule-object
// `end`, `by_year_day`, and `count` are returned by Discord but cannot be set
// externally; all are optional here.
export const RecurrenceRule = Schema.Struct({
  start: Schema.DateTimeUtcFromString,
  end: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
  frequency: RecurrenceFrequency,
  interval: Schema.Int,
  byWeekday: Schema.optionalKey(Schema.Array(RecurrenceWeekday)),
  byNWeekday: Schema.optionalKey(Schema.Array(RecurrenceNWeekday)),
  byMonth: Schema.optionalKey(Schema.Array(RecurrenceMonth)),
  byMonthDay: Schema.optionalKey(Schema.Array(Schema.Int)),
  byYearDay: Schema.optionalKey(Schema.Array(Schema.Int)),
  count: Schema.optionalKey(Schema.Int),
}).pipe(
  Schema.encodeKeys({
    byWeekday: "by_weekday",
    byNWeekday: "by_n_weekday",
    byMonth: "by_month",
    byMonthDay: "by_month_day",
    byYearDay: "by_year_day",
  }),
);
export type RecurrenceRule = typeof RecurrenceRule.Type;

// Minimal creator partial: full user objects are owned by the user module;
// only UserId is imported to avoid a model-level dependency.
export const ScheduledEventCreator = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type ScheduledEventCreator = typeof ScheduledEventCreator.Type;

// https://docs.discord.com/developers/resources/guild-scheduled-event#guild-scheduled-event-object
// Field requirements per entity type (channel_id / entity_metadata /
// scheduled_end_time) are documented, not enforced here: enforcement belongs
// to request validation, and events of any type must decode.
export const GuildScheduledEvent = Schema.Struct({
  id: ScheduledEventId,
  guildId: GuildId,
  channelId: Schema.NullOr(ChannelId),
  creatorId: Schema.optionalKey(Schema.NullOr(UserId)),
  name: Schema.String,
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  scheduledStartTime: Schema.DateTimeUtcFromString,
  scheduledEndTime: Schema.NullOr(Schema.DateTimeUtcFromString),
  privacyLevel: ScheduledEventPrivacyLevel,
  status: ScheduledEventStatus,
  entityType: ScheduledEventEntityType,
  entityId: Schema.NullOr(ScheduledEventId),
  entityMetadata: Schema.NullOr(ScheduledEventEntityMetadata),
  creator: Schema.optionalKey(ScheduledEventCreator),
  userCount: Schema.optionalKey(Schema.Int),
  image: Schema.optionalKey(Schema.NullOr(Schema.String)),
  recurrenceRule: Schema.optionalKey(Schema.NullOr(RecurrenceRule)),
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    channelId: "channel_id",
    creatorId: "creator_id",
    scheduledStartTime: "scheduled_start_time",
    scheduledEndTime: "scheduled_end_time",
    privacyLevel: "privacy_level",
    entityType: "entity_type",
    entityId: "entity_id",
    entityMetadata: "entity_metadata",
    userCount: "user_count",
    recurrenceRule: "recurrence_rule",
  }),
);
export type GuildScheduledEvent = typeof GuildScheduledEvent.Type;
