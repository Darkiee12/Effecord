import { Schema } from "effect";
import { GuildId } from "@/model/guild/id";
import { UserId } from "@/model/user/user";

// Minimal creator partial: full user objects are owned by the user module;
// only UserId is imported to avoid a model-level dependency.
export const GuildTemplateCreator = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type GuildTemplateCreator = typeof GuildTemplateCreator.Type;

// https://docs.discord.com/developers/resources/guild-template#guild-template-object
// Template codes are opaque strings, NOT snowflakes. Deliberately no brand.
// `serialized_source_guild` uses placeholder integer ids and mixes channel,
// role, and overwrite shapes; it is heterogeneous by nature, hence Unknown.
export const GuildTemplate = Schema.Struct({
  code: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  usageCount: Schema.Int,
  creatorId: UserId,
  creator: GuildTemplateCreator,
  createdAt: Schema.DateTimeUtcFromString,
  updatedAt: Schema.DateTimeUtcFromString,
  sourceGuildId: GuildId,
  serializedSourceGuild: Schema.Unknown,
  isDirty: Schema.optionalKey(Schema.NullOr(Schema.Boolean)),
}).pipe(
  Schema.encodeKeys({
    usageCount: "usage_count",
    creatorId: "creator_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
    sourceGuildId: "source_guild_id",
    serializedSourceGuild: "serialized_source_guild",
    isDirty: "is_dirty",
  }),
);
export type GuildTemplate = typeof GuildTemplate.Type;
