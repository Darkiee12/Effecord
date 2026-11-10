import { Schema } from "effect";
import { UserId } from "@/model/user";
import { ChannelId } from "@/model/channel";
import { ApplicationId } from "@/model/application/application";
import { PermissionFlags } from "@/model/permission/flags";
import { GuildId } from "@/model/guild/id";
import {
  AfkTimeout,
  DefaultMessageNotificationLevel,
  ExplicitContentFilterLevel,
  GuildNsfwLevel,
  MfaLevel,
  PremiumTier,
  VerificationLevel,
} from "@/model/guild/levels";
import { SystemChannelFlags } from "@/model/guild/flags";
import { GuildFeatureValue } from "@/model/guild/features";
import { WelcomeScreen } from "@/model/guild/welcome";
import { IncidentsData } from "@/model/guild/incidents";

export { GuildId };

const NonNegativeInt = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const GuildName = Schema.String.check(Schema.isBetweenLength(2, 100), Schema.isTrimmed());

export const Guild = Schema.Struct({
  id: GuildId,
  name: GuildName,

  icon: Schema.NullOr(Schema.String),
  iconHash: Schema.optionalKey(Schema.NullOr(Schema.String)),
  splash: Schema.NullOr(Schema.String),
  discoverySplash: Schema.NullOr(Schema.String),

  owner: Schema.optionalKey(Schema.Boolean),
  ownerId: UserId,
  permissions: Schema.optionalKey(PermissionFlags),

  region: Schema.optionalKey(Schema.NullOr(Schema.String)),

  afkChannelId: Schema.NullOr(ChannelId),
  afkTimeout: AfkTimeout,

  widgetEnabled: Schema.optionalKey(Schema.Boolean),
  widgetChannelId: Schema.optionalKey(Schema.NullOr(ChannelId)),

  verificationLevel: VerificationLevel,
  defaultMessageNotifications: DefaultMessageNotificationLevel,
  explicitContentFilter: ExplicitContentFilterLevel,

  // TODO: Replace once their domain schemas are implemented.
  roles: Schema.Array(Schema.Unknown),
  emojis: Schema.Array(Schema.Unknown),

  features: Schema.Array(GuildFeatureValue),

  mfaLevel: MfaLevel,
  applicationId: Schema.NullOr(ApplicationId),

  systemChannelId: Schema.NullOr(ChannelId),
  systemChannelFlags: SystemChannelFlags,
  rulesChannelId: Schema.NullOr(ChannelId),

  maxPresences: Schema.optionalKey(Schema.NullOr(NonNegativeInt)),
  maxMembers: Schema.optionalKey(NonNegativeInt),

  vanityUrlCode: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  banner: Schema.NullOr(Schema.String),

  premiumTier: PremiumTier,
  premiumSubscriptionCount: Schema.optionalKey(NonNegativeInt),

  preferredLocale: Schema.String,
  publicUpdatesChannelId: Schema.NullOr(ChannelId),

  maxVideoChannelUsers: Schema.optionalKey(NonNegativeInt),
  maxStageVideoChannelUsers: Schema.optionalKey(NonNegativeInt),

  approximateMemberCount: Schema.optionalKey(NonNegativeInt),
  approximatePresenceCount: Schema.optionalKey(NonNegativeInt),

  welcomeScreen: Schema.optionalKey(WelcomeScreen),

  nsfwLevel: GuildNsfwLevel,
  stickers: Schema.optionalKey(Schema.Array(Schema.Unknown)),

  premiumProgressBarEnabled: Schema.Boolean,
  safetyAlertsChannelId: Schema.NullOr(ChannelId),
  incidentsData: Schema.NullOr(IncidentsData),
}).pipe(
  Schema.encodeKeys({
    iconHash: "icon_hash",
    discoverySplash: "discovery_splash",
    ownerId: "owner_id",
    afkChannelId: "afk_channel_id",
    afkTimeout: "afk_timeout",
    widgetEnabled: "widget_enabled",
    widgetChannelId: "widget_channel_id",
    verificationLevel: "verification_level",
    defaultMessageNotifications: "default_message_notifications",
    explicitContentFilter: "explicit_content_filter",
    mfaLevel: "mfa_level",
    applicationId: "application_id",
    systemChannelId: "system_channel_id",
    systemChannelFlags: "system_channel_flags",
    rulesChannelId: "rules_channel_id",
    maxPresences: "max_presences",
    maxMembers: "max_members",
    vanityUrlCode: "vanity_url_code",
    premiumTier: "premium_tier",
    premiumSubscriptionCount: "premium_subscription_count",
    preferredLocale: "preferred_locale",
    publicUpdatesChannelId: "public_updates_channel_id",
    maxVideoChannelUsers: "max_video_channel_users",
    maxStageVideoChannelUsers: "max_stage_video_channel_users",
    approximateMemberCount: "approximate_member_count",
    approximatePresenceCount: "approximate_presence_count",
    welcomeScreen: "welcome_screen",
    nsfwLevel: "nsfw_level",
    premiumProgressBarEnabled: "premium_progress_bar_enabled",
    safetyAlertsChannelId: "safety_alerts_channel_id",
    incidentsData: "incidents_data",
  }),
);

export type Guild = typeof Guild.Type;
