import { Schema } from "effect";
import { ChannelId } from "@/model/channel";
import { EmojiId } from "@/model/emoji";
export const WelcomeScreenChannel = Schema.Struct({
  channelId: ChannelId,
  description: Schema.String,
  emojiId: Schema.NullOr(EmojiId),
  emojiName: Schema.NullOr(Schema.String),
}).pipe(
  Schema.encodeKeys({
    channelId: "channel_id",
    emojiId: "emoji_id",
    emojiName: "emoji_name",
  }),
);
export type WelcomeScreenChannel = typeof WelcomeScreenChannel.Type;

export const WelcomeScreen = Schema.Struct({
  description: Schema.NullOr(Schema.String),
  welcomeChannels: Schema.Array(WelcomeScreenChannel).check(Schema.isMaxLength(5)),
}).pipe(
  Schema.encodeKeys({
    welcomeChannels: "welcome_channels",
  }),
);
export type WelcomeScreen = typeof WelcomeScreen.Type;
