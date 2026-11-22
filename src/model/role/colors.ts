import { Schema } from "effect";

export const RoleColor = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 0xffffff }));
export const RoleColour = RoleColor;
export type RoleColor = typeof RoleColor.Type;
export type RoleColour = RoleColor;

export const RoleColors = Schema.Struct({
  primaryColor: RoleColor,
  secondaryColor: Schema.NullOr(RoleColor),
  tertiaryColor: Schema.NullOr(RoleColor),
}).pipe(
  Schema.encodeKeys({
    primaryColor: "primary_color",
    secondaryColor: "secondary_color",
    tertiaryColor: "tertiary_color",
  }),
);
export type RoleColors = typeof RoleColors.Type;
