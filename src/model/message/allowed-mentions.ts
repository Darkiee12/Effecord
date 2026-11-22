import { Schema } from "effect";
import { RoleId } from "@/model/role/id";
import { UserId } from "@/model/user";

// https://docs.discord.com/developers/resources/message#allowed-mentions-object-allowed-mention-types
export const AllowedMentionType = Schema.Literals(["roles", "users", "everyone"]);
export type AllowedMentionType = typeof AllowedMentionType.Type;

// https://docs.discord.com/developers/resources/message#allowed-mentions-object
// `parse` is mutually exclusive with `roles`/`users` on send; that business
// rule is enforced by the API, not this received-message schema.
export const AllowedMentions = Schema.Struct({
  parse: Schema.optionalKey(Schema.Array(AllowedMentionType)),
  roles: Schema.optionalKey(Schema.Array(RoleId).check(Schema.isMaxLength(100))),
  users: Schema.optionalKey(Schema.Array(UserId).check(Schema.isMaxLength(100))),
  repliedUser: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    repliedUser: "replied_user",
  }),
);
export type AllowedMentions = typeof AllowedMentions.Type;
