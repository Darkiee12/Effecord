import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { PremiumType } from "@/model/user/premium-type";
import { UserFlags } from "@/model/user/flags";
import { AvatarDecorationData, UserId } from "@/model/user/user";
import { Activity } from "./activity";

// Receive-side docs list idle/dnd/online/offline; invisible is a documented send-side
// status (Update Presence) and is accepted here so a documented value never crashes
// the gateway decoder.
export const PresenceStatus = Schema.Literals(["online", "idle", "dnd", "invisible", "offline"]);
export type PresenceStatus = typeof PresenceStatus.Type;

const ClientStatusValue = Schema.Literals(["online", "idle", "dnd"]);
export type ClientStatusValue = typeof ClientStatusValue.Type;

// https://docs.discord.com/developers/events/gateway-events#client-status-object
// Each platform key is absent (not null) when that session is offline/invisible.
// vr is documented alongside desktop/mobile/web and is included.
export const ClientStatus = Schema.Struct({
  desktop: Schema.optionalKey(ClientStatusValue),
  mobile: Schema.optionalKey(ClientStatusValue),
  web: Schema.optionalKey(ClientStatusValue),
  vr: Schema.optionalKey(ClientStatusValue),
});
export type ClientStatus = typeof ClientStatus.Type;

// https://docs.discord.com/developers/events/gateway-events#presence-update
// The user object can be partial: only id is guaranteed. Types of the remaining
// fields are not validated by Discord; the optional scalars below cover the
// documented user fields a presence payload may carry.
export const PresenceUser = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  globalName: Schema.optionalKey(Schema.NullOr(Schema.String)),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
  bot: Schema.optionalKey(Schema.Boolean),
  system: Schema.optionalKey(Schema.Boolean),
  banner: Schema.optionalKey(Schema.NullOr(Schema.String)),
  accentColor: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  locale: Schema.optionalKey(Schema.String),
  verified: Schema.optionalKey(Schema.Boolean),
  mfaEnabled: Schema.optionalKey(Schema.Boolean),
  flags: Schema.optionalKey(UserFlags),
  premiumType: Schema.optionalKey(PremiumType),
  publicFlags: Schema.optionalKey(UserFlags),
  avatarDecorationData: Schema.optionalKey(Schema.NullOr(AvatarDecorationData)),
}).pipe(
  Schema.encodeKeys({
    globalName: "global_name",
    mfaEnabled: "mfa_enabled",
    premiumType: "premium_type",
    publicFlags: "public_flags",
    avatarDecorationData: "avatar_decoration_data",
  }),
);
export type PresenceUser = typeof PresenceUser.Type;

// https://docs.discord.com/developers/events/gateway-events#presence-update
// guild_id is documented as a required key; it is optional here because presence
// payloads embedded in non-guild contexts omit it. Absent and present both decode.
export const Presence = Schema.Struct({
  user: PresenceUser,
  guildId: Schema.optionalKey(GuildId),
  status: PresenceStatus,
  activities: Schema.Array(Activity),
  clientStatus: ClientStatus,
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
    clientStatus: "client_status",
  }),
);
export type Presence = typeof Presence.Type;
