import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { ApplicationId } from "@/model/application";
import { ChannelId } from "@/model/channel/channel";
import { WebhookId } from "@/model/webhook/id";
import { Reaction } from "@/model/reaction";
import { Sticker, StickerItem } from "@/model/sticker";
import { RoleId } from "@/model/role/id";
import { User, UserId } from "@/model/user";
import { Attachment } from "./attachment";
import { MessageApplication } from "./application";
import { Embed } from "./embed";
import { MessageFlags } from "./flags";
import { MessageComponent } from "./layout";
import { MessageId } from "./id";
import { Poll } from "./poll";
import { MentionChannel, MessageActivity, MessageReference, MessageSnapshot } from "./reference";
import { MessageType } from "./type";

export { WebhookId };

// https://docs.discord.com/developers/resources/message#role-subscription-data-object-structure
export const RoleSubscriptionData = Schema.Struct({
  roleSubscriptionListingId: Snowflake.fromString,
  tierName: Schema.String,
  totalMonthsSubscribed: Schema.Int,
  isRenewal: Schema.Boolean,
}).pipe(
  Schema.encodeKeys({
    roleSubscriptionListingId: "role_subscription_listing_id",
    tierName: "tier_name",
    totalMonthsSubscribed: "total_months_subscribed",
    isRenewal: "is_renewal",
  }),
);
export type RoleSubscriptionData = typeof RoleSubscriptionData.Type;

// https://docs.discord.com/developers/resources/message#message-call-object-structure
export const MessageCall = Schema.Struct({
  participants: Schema.Array(UserId),
  endedTimestamp: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
}).pipe(
  Schema.encodeKeys({
    endedTimestamp: "ended_timestamp",
  }),
);
export type MessageCall = typeof MessageCall.Type;

// https://docs.discord.com/developers/resources/message#shared-client-theme-object-structure
export const SharedClientBaseTheme = Schema.Enum({
  Unset: 0,
  Dark: 1,
  Light: 2,
  Darker: 3,
  Midnight: 4,
});
export type SharedClientBaseTheme = typeof SharedClientBaseTheme.Type;

export const SharedClientTheme = Schema.Struct({
  colors: Schema.Array(Schema.String).check(Schema.isMaxLength(5)),
  gradientAngle: Schema.Int,
  baseMix: Schema.Int,
  baseTheme: Schema.optionalKey(Schema.NullOr(SharedClientBaseTheme)),
}).pipe(
  Schema.encodeKeys({
    gradientAngle: "gradient_angle",
    baseMix: "base_mix",
    baseTheme: "base_theme",
  }),
);
export type SharedClientTheme = typeof SharedClientTheme.Type;

// https://docs.discord.com/developers/resources/message#message-object
// Received-message model. Creation payloads are a separate (REST layer)
// concern and are intentionally not modeled here.
const messageBaseFields = {
  id: MessageId,
  channelId: ChannelId,
  author: User,
  content: Schema.String,
  timestamp: Schema.DateTimeUtcFromString,
  editedTimestamp: Schema.NullOr(Schema.DateTimeUtcFromString),
  tts: Schema.Boolean,
  mentionEveryone: Schema.Boolean,
  mentions: Schema.Array(User),
  mentionRoles: Schema.Array(RoleId),
  mentionChannels: Schema.optionalKey(Schema.Array(MentionChannel)),
  attachments: Schema.Array(Attachment),
  embeds: Schema.Array(Embed),
  reactions: Schema.optionalKey(Schema.Array(Reaction)),
  nonce: Schema.optionalKey(Schema.Union([Schema.Int, Schema.String])),
  pinned: Schema.Boolean,
  webhookId: Schema.optionalKey(WebhookId),
  type: MessageType,
  activity: Schema.optionalKey(MessageActivity),
  // Partial application: Rich Presence embeds carry only the display subset
  // (see ./application.ts). Full application payloads also decode.
  application: Schema.optionalKey(MessageApplication),
  applicationId: Schema.optionalKey(ApplicationId),
  flags: Schema.optionalKey(MessageFlags),
  messageReference: Schema.optionalKey(MessageReference),
  messageSnapshots: Schema.optionalKey(Schema.Array(MessageSnapshot)),
  // No interaction domain exists yet: docs define application-command,
  // message-component, and modal-submit metadata variants.
  interactionMetadata: Schema.optionalKey(Schema.Unknown),
  // Deprecated in favor of interaction_metadata; same reason as above.
  interaction: Schema.optionalKey(Schema.Unknown),
  // Full thread channel object including a thread member. Left as Unknown:
  // the channel thread schemas have no member field, so decoding through
  // them would strip it; Unknown preserves the wire value.
  thread: Schema.optionalKey(Schema.Unknown),
  components: Schema.optionalKey(Schema.Array(MessageComponent)),
  stickerItems: Schema.optionalKey(Schema.Array(StickerItem)),
  // Deprecated sticker array.
  stickers: Schema.optionalKey(Schema.Array(Sticker)),
  position: Schema.optionalKey(Schema.Int),
  roleSubscriptionData: Schema.optionalKey(RoleSubscriptionData),
  // Resolved users/members/channels/roles: part of the (unbuilt) interaction
  // domain; Unknown preserves the wire value.
  resolved: Schema.optionalKey(Schema.Unknown),
  poll: Schema.optionalKey(Poll),
  call: Schema.optionalKey(MessageCall),
  sharedClientTheme: Schema.optionalKey(SharedClientTheme),
};

const messageKeys = {
  channelId: "channel_id",
  editedTimestamp: "edited_timestamp",
  mentionEveryone: "mention_everyone",
  mentionRoles: "mention_roles",
  mentionChannels: "mention_channels",
  webhookId: "webhook_id",
  applicationId: "application_id",
  messageReference: "message_reference",
  messageSnapshots: "message_snapshots",
  interactionMetadata: "interaction_metadata",
  stickerItems: "sticker_items",
  roleSubscriptionData: "role_subscription_data",
  referencedMessage: "referenced_message",
  sharedClientTheme: "shared_client_theme",
} as const;

const MessageBase = Schema.Struct(messageBaseFields).pipe(
  Schema.encodeKeys({
    channelId: "channel_id",
    editedTimestamp: "edited_timestamp",
    mentionEveryone: "mention_everyone",
    mentionRoles: "mention_roles",
    mentionChannels: "mention_channels",
    webhookId: "webhook_id",
    applicationId: "application_id",
    messageReference: "message_reference",
    messageSnapshots: "message_snapshots",
    interactionMetadata: "interaction_metadata",
    stickerItems: "sticker_items",
    roleSubscriptionData: "role_subscription_data",
    sharedClientTheme: "shared_client_theme",
  }),
);
type MessageBase = typeof MessageBase.Type;
type MessageBaseEncoded = typeof MessageBase.Encoded;

// `referenced_message` is a genuine recursive object: absent when the backend
// did not attempt a fetch, null when the referenced message was deleted.
export interface Message extends MessageBase {
  readonly referencedMessage?: Message | null | undefined;
}

export interface MessageEncoded extends MessageBaseEncoded {
  readonly referenced_message?: MessageEncoded | null | undefined;
}

export const Message: Schema.Codec<Message, MessageEncoded> = Schema.Struct({
  ...messageBaseFields,
  referencedMessage: Schema.optionalKey(
    Schema.NullOr(Schema.suspend((): Schema.Codec<Message, MessageEncoded> => Message)),
  ),
}).pipe(Schema.encodeKeys(messageKeys));
