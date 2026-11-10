import { Schema } from "effect";
import { RoleId } from "@/model/role/id";
import { UserId } from "@/model/user";
import { PermissionFlags } from "./flags";

export const PermissionOverwriteType = Schema.Enum({
  Role: 0,
  Member: 1,
});

export type PermissionOverwriteType = typeof PermissionOverwriteType.Type;

const fields = {
  allow: PermissionFlags,
  deny: PermissionFlags,
};

export const RolePermissionOverwrite = Schema.Struct({
  ...fields,
  id: RoleId,
  type: Schema.Literal(PermissionOverwriteType.enums.Role),
});

export type RolePermissionOverwrite = typeof RolePermissionOverwrite.Type;

export const MemberPermissionOverwrite = Schema.Struct({
  ...fields,
  id: UserId,
  type: Schema.Literal(PermissionOverwriteType.enums.Member),
});

export type MemberPermissionOverwrite = typeof MemberPermissionOverwrite.Type;

export const PermissionOverwrite = Schema.Union([
  RolePermissionOverwrite,
  MemberPermissionOverwrite,
]);

export type PermissionOverwrite = typeof PermissionOverwrite.Type;

export const isRole = Schema.is(RolePermissionOverwrite);
export const isMember = Schema.is(MemberPermissionOverwrite);
