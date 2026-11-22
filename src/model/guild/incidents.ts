import { Schema } from "effect";

export const IncidentsData = Schema.Struct({
  invitesDisabledUntil: Schema.NullOr(Schema.DateTimeUtcFromString),
  dmsDisabledUntil: Schema.NullOr(Schema.DateTimeUtcFromString),
  dmSpamDetectedAt: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
  raidDetectedAt: Schema.optionalKey(Schema.NullOr(Schema.DateTimeUtcFromString)),
}).pipe(
  Schema.encodeKeys({
    invitesDisabledUntil: "invites_disabled_until",
    dmsDisabledUntil: "dms_disabled_until",
    dmSpamDetectedAt: "dm_spam_detected_at",
    raidDetectedAt: "raid_detected_at",
  }),
);
export type IncidentsData = typeof IncidentsData.Type;
