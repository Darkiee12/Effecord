import { Schema } from "effect";

export const VideoQualityMode = Schema.Enum({ Auto: 1, Full: 2 });
export type VideoQualityMode = typeof VideoQualityMode.Type;
