import { Schema } from "effect";

import { ApplicationId } from "@/model/application/application";

// Partial application object sent with Rich Presence chat embeds
// (`message.application`) and Clip attachments (`attachment.application`).
// The docs link the full application table without enumerating a fixed
// partial subset, so every display field is optional and nullable for wire
// fidelity; only `id` is required. A full application payload still decodes
// (extra keys are stripped) and re-encodes to the partial shape.
export const MessageApplication = Schema.Struct({
  id: ApplicationId,
  coverImage: Schema.optionalKey(Schema.NullOr(Schema.String)),
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  icon: Schema.optionalKey(Schema.NullOr(Schema.String)),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
}).pipe(
  Schema.encodeKeys({
    coverImage: "cover_image",
  }),
);
export type MessageApplication = typeof MessageApplication.Type;
