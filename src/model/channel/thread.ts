import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { UserFlag, UserId } from "@/model/user";
import { GuildMember } from "@/model/guild";

export const ThreadId = Snowflake.fromString.pipe(Schema.brand("ThreadId"));
export type ThreadId = typeof ThreadId.Type;
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
    archiveTimestamp: "archived_timestamp",
    createTimestamp: "create_timestamp",
  }),
);

export type ThreadMetadata = typeof ThreadMetadata.Type;

export const ThreadMember = Schema.Struct({
  id: Schema.optionalKey(ThreadId),
  userId: Schema.optionalKey(UserId),
  joinTimestamp: Schema.DateTimeUtcFromString,
  flags: UserFlag,
  member: Schema.optionalKey(GuildMember),
}).pipe(
  Schema.encodeKeys({
    userId: "user_id",
    joinTimestamp: "join_timestamp",
  }),
);
