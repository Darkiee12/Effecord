import { Schema } from "effect";
import { EmojiId } from "@/model/emoji";

// https://docs.discord.com/developers/resources/poll#poll-media-object-poll-media-object-structure
// Partial emoji: only id (custom) or name (default) is sent on create.
export const PollEmoji = Schema.Struct({
  id: Schema.optionalKey(Schema.NullOr(EmojiId)),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  animated: Schema.optionalKey(Schema.Boolean),
});
export type PollEmoji = typeof PollEmoji.Type;

export const PollMedia = Schema.Struct({
  // Docs: text should always be non-null, but "please do not depend on that".
  text: Schema.optionalKey(Schema.NullOr(Schema.String)),
  emoji: Schema.optionalKey(PollEmoji),
});
export type PollMedia = typeof PollMedia.Type;

// https://docs.discord.com/developers/resources/poll#poll-answer-object-poll-answer-object-structure
export const PollAnswer = Schema.Struct({
  answerId: Schema.Int,
  pollMedia: PollMedia,
}).pipe(
  Schema.encodeKeys({
    answerId: "answer_id",
    pollMedia: "poll_media",
  }),
);
export type PollAnswer = typeof PollAnswer.Type;

// https://docs.discord.com/developers/resources/poll#layout-type
// Only the default layout exists today; strict until Discord adds more.
export const PollLayoutType = Schema.Enum({
  Default: 1,
});
export type PollLayoutType = typeof PollLayoutType.Type;

// https://docs.discord.com/developers/resources/poll#poll-results-object-poll-answer-count-object-structure
export const PollAnswerCount = Schema.Struct({
  id: Schema.Int,
  count: Schema.Int,
  meVoted: Schema.Boolean,
}).pipe(
  Schema.encodeKeys({
    meVoted: "me_voted",
  }),
);
export type PollAnswerCount = typeof PollAnswerCount.Type;

// https://docs.discord.com/developers/resources/poll#poll-results-object-poll-results-object-structure
export const PollResults = Schema.Struct({
  isFinalized: Schema.Boolean,
  answerCounts: Schema.Array(PollAnswerCount),
}).pipe(
  Schema.encodeKeys({
    isFinalized: "is_finalized",
    answerCounts: "answer_counts",
  }),
);
export type PollResults = typeof PollResults.Type;

// https://docs.discord.com/developers/resources/poll#poll-object-poll-object-structure
export const Poll = Schema.Struct({
  question: PollMedia,
  answers: Schema.Array(PollAnswer),
  // Nullable to support non-expiring polls in the future; all polls expire today.
  expiry: Schema.NullOr(Schema.DateTimeUtcFromString),
  allowMultiselect: Schema.Boolean,
  layoutType: PollLayoutType,
  results: Schema.optionalKey(PollResults),
}).pipe(
  Schema.encodeKeys({
    allowMultiselect: "allow_multiselect",
    layoutType: "layout_type",
  }),
);
export type Poll = typeof Poll.Type;
