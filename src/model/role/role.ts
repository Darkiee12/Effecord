import { Schema } from "effect";

import { PermissionFlags } from "@/model/permission";
import { RoleColor, RoleColors } from "@/model/role/colors";
import { RoleFlags } from "@/model/role/flags";
import { RoleId } from "@/model/role/id";
import { RoleTags } from "@/model/role/tags";

export { RoleId };

export const Role = Schema.Struct({
  id: RoleId,
  name: Schema.String,
  color: RoleColor,
  colors: RoleColors,
  hoist: Schema.Boolean,
  icon: Schema.optionalKey(Schema.NullOr(Schema.String)),
  unicodeEmoji: Schema.optionalKey(Schema.NullOr(Schema.String)),
  position: Schema.Int,
  permissions: PermissionFlags,
  managed: Schema.Boolean,
  mentionable: Schema.Boolean,
  tags: Schema.optionalKey(RoleTags),
  flags: RoleFlags,
}).pipe(
  Schema.encodeKeys({
    unicodeEmoji: "unicode_emoji",
  }),
);
export type Role = typeof Role.Type;
