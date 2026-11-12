import { Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { GuildId } from "@/model/guild/id";
import { UserId } from "@/model/user/user";
import { EmojiId } from "@/model/emoji/id";

export const SoundboardSoundId = Snowflake.fromString.pipe(Schema.brand("SoundboardSoundId"));
export type SoundboardSoundId = typeof SoundboardSoundId.Type;

// Minimal creator partial: full user objects are owned by the user module;
// only UserId is imported to avoid a model-level dependency.
export const SoundboardSoundUser = Schema.Struct({
  id: UserId,
  username: Schema.optionalKey(Schema.String),
  discriminator: Schema.optionalKey(Schema.String),
  avatar: Schema.optionalKey(Schema.NullOr(Schema.String)),
});
export type SoundboardSoundUser = typeof SoundboardSoundUser.Type;

// https://docs.discord.com/developers/resources/soundboard#soundboard-sound-object
export const SoundboardSound = Schema.Struct({
  name: Schema.String,
  soundId: SoundboardSoundId,
  volume: Schema.Number,
  emojiId: Schema.NullOr(EmojiId),
  emojiName: Schema.NullOr(Schema.String),
  guildId: Schema.optionalKey(GuildId),
  available: Schema.Boolean,
  user: Schema.optionalKey(SoundboardSoundUser),
}).pipe(
  Schema.encodeKeys({
    soundId: "sound_id",
    emojiId: "emoji_id",
    emojiName: "emoji_name",
    guildId: "guild_id",
  }),
);
export type SoundboardSound = typeof SoundboardSound.Type;
