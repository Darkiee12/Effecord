import { Schema } from "effect";

import { EmojiPartial } from "@/model/emoji";

// https://docs.discord.com/developers/resources/message#reaction-object
// No `burst_me` field exists in the current docs; burst state is `me_burst`
// plus the burst/normal breakdown in `count_details`.
export const ReactionCountDetails = Schema.Struct({
  burst: Schema.Int,
  normal: Schema.Int,
});
export type ReactionCountDetails = typeof ReactionCountDetails.Type;

export const Reaction = Schema.Struct({
  count: Schema.Int,
  countDetails: ReactionCountDetails,
  me: Schema.Boolean,
  meBurst: Schema.Boolean,
  emoji: EmojiPartial,
  burstColors: Schema.Array(Schema.String),
}).pipe(
  Schema.encodeKeys({
    countDetails: "count_details",
    meBurst: "me_burst",
    burstColors: "burst_colors",
  }),
);
export type Reaction = typeof Reaction.Type;
