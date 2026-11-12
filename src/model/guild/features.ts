import { Schema } from "effect";

export const GuildFeature = Schema.Enum({
  AnimatedBanner: "ANIMATED_BANNER",
  AnimatedIcon: "ANIMATED_ICON",
  ApplicationCommandPermissionsV2: "APPLICATION_COMMAND_PERMISSIONS_V2",
  AutoModeration: "AUTO_MODERATION",
  Banner: "BANNER",
  Community: "COMMUNITY",
  CreatorMonetizableProvisional: "CREATOR_MONETIZABLE_PROVISIONAL",
  CreatorStorePage: "CREATOR_STORE_PAGE",
  DeveloperSupportServer: "DEVELOPER_SUPPORT_SERVER",
  Discoverable: "DISCOVERABLE",
  EnhancedRoleColors: "ENHANCED_ROLE_COLORS",
  Featurable: "FEATURABLE",
  GuildTags: "GUILD_TAGS",
  GuestsEnabled: "GUESTS_ENABLED",
  InvitesDisabled: "INVITES_DISABLED",
  InviteSplash: "INVITE_SPLASH",
  MemberVerificationGateEnabled: "MEMBER_VERIFICATION_GATE_ENABLED",
  MoreSoundboard: "MORE_SOUNDBOARD",
  MoreStickers: "MORE_STICKERS",
  News: "NEWS",
  Partnered: "PARTNERED",
  PreviewEnabled: "PREVIEW_ENABLED",
  PruneRequiresAdmin: "PRUNE_REQUIRES_ADMIN",
  RaidAlertsDisabled: "RAID_ALERTS_DISABLED",
  RoleIcons: "ROLE_ICONS",
  RoleSubscriptionsAvailableForPurchase: "ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE",
  RoleSubscriptionsEnabled: "ROLE_SUBSCRIPTIONS_ENABLED",
  Soundboard: "SOUNDBOARD",
  TicketedEventsEnabled: "TICKETED_EVENTS_ENABLED",
  VanityUrl: "VANITY_URL",
  Verified: "VERIFIED",
  VipRegions: "VIP_REGIONS",
  WelcomeScreenEnabled: "WELCOME_SCREEN_ENABLED",
});
export type GuildFeature = typeof GuildFeature.Type;

export const MutableGuildFeature = Schema.Enum({
  Community: GuildFeature.enums.Community,
  Discoverable: GuildFeature.enums.Discoverable,
  InvitesDisabled: GuildFeature.enums.InvitesDisabled,
  RaidAlertsDisabled: GuildFeature.enums.RaidAlertsDisabled,
});
export type MutableGuildFeature = typeof MutableGuildFeature.Type;

const isKnownGuildFeature = Schema.is(GuildFeature);

export const UnknownGuildFeature = Schema.String.check(
  Schema.makeFilter((value) => !isKnownGuildFeature(value)),
).pipe(Schema.brand("UnknownGuildFeature"));

export type UnknownGuildFeature = typeof UnknownGuildFeature.Type;

export const GuildFeatureValue = Schema.Union([GuildFeature, UnknownGuildFeature]);
export type GuildFeatureValue = typeof GuildFeatureValue.Type;
