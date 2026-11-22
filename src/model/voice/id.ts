import { Schema } from "effect";

// Voice region ids are opaque strings, not snowflakes.
// https://docs.discord.com/developers/resources/voice#voice-region-object
export const VoiceRegionId = Schema.String.pipe(Schema.brand("VoiceRegionId"));
export type VoiceRegionId = typeof VoiceRegionId.Type;
