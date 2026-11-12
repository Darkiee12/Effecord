import { HashMap, Schema } from "effect";
import * as BitSet from "@/util/bitset";

export const ChannelFlag = HashMap.fromIterable([
  ["Pinned", 1 << 1],
  ["RequireTag", 1 << 4],
  ["HideMediaDownloadOptions", 1 << 15],
  ["ChannelObfuscated", 1 << 17],
  ["IsSpoilerChannel", 1 << 21],
] as const);

export type ChannelFlag = HashMap.HashMap.Key<typeof ChannelFlag>;
const channel = BitSet.make("ChannelBitSet", ChannelFlag);

export const ChannelBitSet = channel.BitSet;
export type ChannelBitSet = InstanceType<typeof ChannelBitSet>;

export const ChannelFlags = channel.fromNumber;
export type ChannelFlags = typeof ChannelFlags.Type;

export const VisibleChannelFlags = ChannelFlags.check(
  Schema.makeFilter(
    (flags) =>
      !flags.has("ChannelObfuscated") || "Visible channel cannot have the obfuscation flag",
  ),
);

export const ObfuscatedChannelFlags = ChannelFlags.check(
  Schema.makeFilter(
    (flags) =>
      flags.has("ChannelObfuscated") || "Obfuscated channel must have the obfuscation flag",
  ),
);
