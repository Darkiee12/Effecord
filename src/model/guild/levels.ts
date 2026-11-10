import { Schema } from "effect";

export const DefaultMessageNotificationLevel = Schema.Enum({
  AllMessages: 0,
  OnlyMentions: 1,
});
export type DefaultMessageNotificationLevel = typeof DefaultMessageNotificationLevel.Type;

export const ExplicitContentFilterLevel = Schema.Enum({
  Disabled: 0,
  MembersWithoutRoles: 1,
  AllMembers: 2,
});
export type ExplicitContentFilterLevel = typeof ExplicitContentFilterLevel.Type;

export const MfaLevel = Schema.Enum({
  None: 0,
  Elevated: 1,
});
export type MfaLevel = typeof MfaLevel.Type;

export const VerificationLevel = Schema.Enum({
  None: 0,
  Low: 1,
  Medium: 2,
  High: 3,
  VeryHigh: 4,
});
export type VerificationLevel = typeof VerificationLevel.Type;

export const GuildNsfwLevel = Schema.Enum({
  Default: 0,
  Explicit: 1,
  Safe: 2,
  AgeRestricted: 3,
});
export type GuildNsfwLevel = typeof GuildNsfwLevel.Type;

export const PremiumTier = Schema.Enum({
  None: 0,
  Tier1: 1,
  Tier2: 2,
  Tier3: 3,
});
export type PremiumTier = typeof PremiumTier.Type;

export const AfkTimeout = Schema.Enum({
  OneMinute: 60,
  FiveMinutes: 300,
  FifteenMinutes: 900,
  ThirtyMinutes: 1800,
  OneHour: 3600,
});
export type AfkTimeout = typeof AfkTimeout.Type;
