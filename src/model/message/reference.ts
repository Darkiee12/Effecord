import { Schema } from "effect";
import { MessageId } from "@/model/channel/message";
import { ChannelId } from "@/model/channel/channel";
import { GuildId } from "@/model/guild/id";
import { RoleId } from "@/model/role/id";
import { Sticker, StickerItem } from "@/model/sticker";
import { User } from "@/model/user";
import { Attachment } from "./attachment";
import { Embed } from "./embed";
import { MessageFlags } from "./flags";
import { MessageComponent } from "./layout";
import { MessageType } from "./type";

// https://docs.discord.com/developers/resources/message#message-reference-types
export const MessageReferenceType = Schema.Enum({
  Default: 0,
  Forward: 1,
});
export type MessageReferenceType = typeof MessageReferenceType.Type;

// https://docs.discord.com/developers/resources/message#message-reference-structure
export const MessageReference = Schema.Struct({
  type: Schema.optionalKey(MessageReferenceType),
  messageId: Schema.optionalKey(MessageId),
  channelId: Schema.optionalKey(ChannelId),
  guildId: Schema.optionalKey(GuildId),
  failIfNotExists: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    messageId: "message_id",
    channelId: "channel_id",
    guildId: "guild_id",
    failIfNotExists: "fail_if_not_exists",
  }),
);
export type MessageReference = typeof MessageReference.Type;

// https://docs.discord.com/developers/resources/message#message-object-message-activity-types
// Docs list 1/2/3/5 plus STREAM_REQUEST 6; 4 is unassigned.
export const MessageActivityType = Schema.Enum({
  Join: 1,
  Spectate: 2,
  Listen: 3,
  JoinRequest: 5,
  StreamRequest: 6,
});
export type MessageActivityType = typeof MessageActivityType.Type;

// https://docs.discord.com/developers/resources/message#message-activity-structure
export const MessageActivity = Schema.Struct({
  type: MessageActivityType,
  partyId: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    partyId: "party_id",
  }),
);
export type MessageActivity = typeof MessageActivity.Type;

// https://docs.discord.com/developers/resources/message#channel-mention-structure
export const MentionChannel = Schema.Struct({
  id: ChannelId,
  guildId: GuildId,
  // TODO: correlate with KnownChannelType once the channel import surface
  // allows more than ChannelId/MessageId. Plain int for now.
  type: Schema.Int,
  name: Schema.String,
}).pipe(
  Schema.encodeKeys({
    guildId: "guild_id",
  }),
);
export type MentionChannel = typeof MentionChannel.Type;

// https://docs.discord.com/developers/resources/message#message-snapshot-object
// Snapshot `message` is a minimal subset, NOT the full Message: `author` is
// excluded. Nested snapshots are supported by Discord up to depth 1, so the
// subset genuinely recurses through message_snapshots.
const snapshotMessageBaseFields = {
  type: MessageType,
  content: Schema.String,
  embeds: Schema.Array(Embed),
  attachments: Schema.Array(Attachment),
  timestamp: Schema.DateTimeUtcFromString,
  editedTimestamp: Schema.NullOr(Schema.DateTimeUtcFromString),
  flags: Schema.optionalKey(MessageFlags),
  mentions: Schema.Array(User),
  mentionRoles: Schema.Array(RoleId),
  stickers: Schema.optionalKey(Schema.Array(Sticker)),
  stickerItems: Schema.optionalKey(Schema.Array(StickerItem)),
  components: Schema.optionalKey(Schema.Array(MessageComponent)),
};

const snapshotMessageKeys = {
  editedTimestamp: "edited_timestamp",
  mentionRoles: "mention_roles",
  stickerItems: "sticker_items",
  messageSnapshots: "message_snapshots",
} as const;

const SnapshotMessageBase = Schema.Struct(snapshotMessageBaseFields).pipe(
  Schema.encodeKeys({
    editedTimestamp: "edited_timestamp",
    mentionRoles: "mention_roles",
    stickerItems: "sticker_items",
  }),
);
type SnapshotMessageBase = typeof SnapshotMessageBase.Type;
type SnapshotMessageBaseEncoded = typeof SnapshotMessageBase.Encoded;

export interface SnapshotMessage extends SnapshotMessageBase {
  readonly messageSnapshots?: ReadonlyArray<MessageSnapshot> | undefined;
}

export interface MessageSnapshot {
  readonly message: SnapshotMessage;
}

export interface SnapshotMessageEncoded extends SnapshotMessageBaseEncoded {
  readonly message_snapshots?: ReadonlyArray<MessageSnapshotEncoded> | undefined;
}

export interface MessageSnapshotEncoded {
  readonly message: SnapshotMessageEncoded;
}

export const MessageSnapshot: Schema.Codec<MessageSnapshot, MessageSnapshotEncoded> = Schema.Struct(
  {
    message: Schema.suspend(
      (): Schema.Codec<SnapshotMessage, SnapshotMessageEncoded> => SnapshotMessage,
    ),
  },
);

export const SnapshotMessage: Schema.Codec<SnapshotMessage, SnapshotMessageEncoded> = Schema.Struct(
  {
    ...snapshotMessageBaseFields,
    messageSnapshots: Schema.optionalKey(
      Schema.Array(
        Schema.suspend(
          (): Schema.Codec<MessageSnapshot, MessageSnapshotEncoded> => MessageSnapshot,
        ),
      ),
    ),
  },
).pipe(Schema.encodeKeys(snapshotMessageKeys));
