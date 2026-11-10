import { Schema } from "effect";
import { UserId } from "@/model/user";
import { GuildMember } from "@/model/guild/member";
import { ChannelId } from "./channel";

export const ThreadMetadata = Schema.Struct({
  archived: Schema.Boolean,
  autoArchiveDuration: Schema.Int,
  archiveTimestamp: Schema.DateTimeUtcFromString,
  locked: Schema.Boolean,
  /* Only available in Private threads */
  invitable: Schema.optionalKey(Schema.Boolean),
  createTimestamp: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
}).pipe(
  Schema.encodeKeys({
    autoArchiveDuration: "auto_archive_duration",
    archiveTimestamp: "archive_timestamp",
    createTimestamp: "create_timestamp",
  }),
);

export type ThreadMetadata = typeof ThreadMetadata.Type;

export const ThreadMember = Schema.Struct({
  id: Schema.optionalKey(ChannelId),
  userId: Schema.optionalKey(UserId),
  joinTimestamp: Schema.DateTimeUtcFromString,
  flags: Schema.Int,
  member: Schema.optionalKey(GuildMember),
}).pipe(
  Schema.encodeKeys({
    userId: "user_id",
    joinTimestamp: "join_timestamp",
  }),
);
export type ThreadMember = typeof ThreadMember.Type;
