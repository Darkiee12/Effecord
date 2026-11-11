import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { UserId } from "@/model/user/";

// https://docs.discord.com/developers/topics/teams#data-models-team-object
export const TeamId = Snowflake.fromString.pipe(Schema.brand("TeamId"));
export type TeamId = typeof TeamId.Type;
export const TeamMembershipState = Schema.Enum({
  Invited: 1,
  Accepted: 2,
});
export type TeamMembershipState = typeof TeamMembershipState.Type;

// Full user objects are owned by the user module; only the id is imported to
// avoid a model-level dependency. Display fields are duplicated minimally.
export const TeamMemberUser = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type TeamMemberUser = typeof TeamMemberUser.Type;

export const TeamMember = Schema.Struct({
  membershipState: TeamMembershipState,
  teamId: TeamId,
  user: TeamMemberUser,
  // Documented as required, but the canonical application example omits it
  // (owner entries carry `permissions` instead): optional for wire fidelity.
  role: Schema.optionalKey(Schema.String),
  // `permissions` is absent from the team docs table but present in the
  // canonical application example: optional for wire fidelity.
  permissions: Schema.optionalKey(Schema.Array(Schema.String)),
}).pipe(
  Schema.encodeKeys({
    membershipState: "membership_state",
    teamId: "team_id",
  }),
);
export type TeamMember = typeof TeamMember.Type;

export const Team = Schema.Struct({
  icon: Schema.NullOr(Schema.String),
  id: TeamId,
  members: Schema.Array(TeamMember),
  name: Schema.String,
  ownerUserId: UserId,
}).pipe(
  Schema.encodeKeys({
    ownerUserId: "owner_user_id",
  }),
);
export type Team = typeof Team.Type;
