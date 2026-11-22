import * as Snowflake from "@/model/snowflake";
import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { UserId, SkuId } from "@/model/user/user";
import { ApplicationFlags, ApplicationFlagsNew } from "./flags";
import { Team } from "./team";

export const ApplicationId = Snowflake.fromString.pipe(Schema.brand("ApplicationId"));
export type ApplicationId = typeof ApplicationId.Type;

// https://docs.discord.com/developers/resources/application#install-params-object
export const InstallParams = Schema.Struct({
  scopes: Schema.Array(Schema.String),
  permissions: Schema.String,
});
export type InstallParams = typeof InstallParams.Type;

// https://docs.discord.com/developers/resources/application#application-object-application-integration-types
export const ApplicationIntegrationType = Schema.Enum({
  GuildInstall: 0,
  UserInstall: 1,
});
export type ApplicationIntegrationType = typeof ApplicationIntegrationType.Type;

// https://docs.discord.com/developers/resources/application#application-object-application-event-webhook-status
export const ApplicationEventWebhookStatus = Schema.Enum({
  Disabled: 1,
  Enabled: 2,
  DisabledByDiscord: 3,
});
export type ApplicationEventWebhookStatus = typeof ApplicationEventWebhookStatus.Type;

export const ApplicationIntegrationTypeConfig = Schema.Struct({
  oauth2InstallParams: Schema.optionalKey(InstallParams),
}).pipe(
  Schema.encodeKeys({
    oauth2InstallParams: "oauth2_install_params",
  }),
);
export type ApplicationIntegrationTypeConfig = typeof ApplicationIntegrationTypeConfig.Type;

// Full user objects are owned by the user module; only UserId is imported to
// avoid a model-level dependency. Display fields are duplicated minimally for
// the `bot` and `owner` partials.
export const PartialApplicationUser = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
  bot: Schema.optionalKey(Schema.Boolean),
});
export type PartialApplicationUser = typeof PartialApplicationUser.Type;

// https://docs.discord.com/developers/resources/application#application-object
export const Application = Schema.Struct({
  id: ApplicationId,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String),
  description: Schema.String,
  rpcOrigins: Schema.optionalKey(Schema.Array(Schema.String)),
  botPublic: Schema.Boolean,
  botRequireCodeGrant: Schema.Boolean,
  bot: Schema.optionalKey(PartialApplicationUser),
  termsOfServiceUrl: Schema.optionalKey(Schema.String),
  privacyPolicyUrl: Schema.optionalKey(Schema.String),
  owner: Schema.optionalKey(PartialApplicationUser),
  verifyKey: Schema.String,
  team: Schema.NullOr(Team),
  guildId: Schema.optionalKey(GuildId),
  // `guild` (partial guild snapshot) is skipped: the guild module owns that
  // shape. Struct decoding strips it; recorded as deferred, not unsupported.
  primarySkuId: Schema.optionalKey(SkuId),
  slug: Schema.optionalKey(Schema.String),
  coverImage: Schema.optionalKey(Schema.String),
  flags: Schema.optionalKey(ApplicationFlags),
  flagsNew: Schema.optionalKey(ApplicationFlagsNew),
  approximateGuildCount: Schema.optionalKey(Schema.Int),
  approximateUserInstallCount: Schema.optionalKey(Schema.Int),
  approximateUserAuthorizationCount: Schema.optionalKey(Schema.Int),
  redirectUris: Schema.optionalKey(Schema.Array(Schema.String)),
  interactionsEndpointUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  roleConnectionsVerificationUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  eventWebhooksUrl: Schema.optionalKey(Schema.NullOr(Schema.String)),
  eventWebhooksStatus: Schema.optionalKey(ApplicationEventWebhookStatus),
  eventWebhooksTypes: Schema.optionalKey(Schema.Array(Schema.String)),
  tags: Schema.optionalKey(Schema.Array(Schema.String)),
  installParams: Schema.optionalKey(InstallParams),
  // Keyed by integration type id on the wire ("0" guild, "1" user).
  // A struct (not Record) keeps each context independently optional.
  integrationTypesConfig: Schema.optionalKey(
    Schema.Struct({
      "0": Schema.optionalKey(ApplicationIntegrationTypeConfig),
      "1": Schema.optionalKey(ApplicationIntegrationTypeConfig),
    }),
  ),
  customInstallUrl: Schema.optionalKey(Schema.String),
  // `rpc_application_state` / `store_application_state` are legacy GameSDK
  // fields absent from current docs: deferred explicitly, not modeled.
}).pipe(
  Schema.encodeKeys({
    rpcOrigins: "rpc_origins",
    botPublic: "bot_public",
    botRequireCodeGrant: "bot_require_code_grant",
    termsOfServiceUrl: "terms_of_service_url",
    privacyPolicyUrl: "privacy_policy_url",
    verifyKey: "verify_key",
    guildId: "guild_id",
    primarySkuId: "primary_sku_id",
    coverImage: "cover_image",
    flagsNew: "flags_new",
    approximateGuildCount: "approximate_guild_count",
    approximateUserInstallCount: "approximate_user_install_count",
    approximateUserAuthorizationCount: "approximate_user_authorization_count",
    redirectUris: "redirect_uris",
    interactionsEndpointUrl: "interactions_endpoint_url",
    roleConnectionsVerificationUrl: "role_connections_verification_url",
    eventWebhooksUrl: "event_webhooks_url",
    eventWebhooksStatus: "event_webhooks_status",
    eventWebhooksTypes: "event_webhooks_types",
    installParams: "install_params",
    integrationTypesConfig: "integration_types_config",
    customInstallUrl: "custom_install_url",
  }),
);
export type Application = typeof Application.Type;
