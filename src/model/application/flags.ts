import { HashMap } from "effect";
import * as BitSet from "@/util/bitset";

// https://docs.discord.com/developers/resources/application#application-object-application-flags
// NOTE: `flags` is a JSON number (legacy, 31 bits); `flags_new` is a decimal
// string carrying the full set. Both decode into the same bit meanings.
export const ApplicationFlag = HashMap.fromIterable([
  ["ApplicationAutoModerationRuleCreateBadge", 1n << 6n],
  ["GatewayPresence", 1n << 12n],
  ["GatewayPresenceLimited", 1n << 13n],
  ["GatewayGuildMembers", 1n << 14n],
  ["GatewayGuildMembersLimited", 1n << 15n],
  ["VerificationPendingGuildLimit", 1n << 16n],
  ["Embedded", 1n << 17n],
  ["GatewayMessageContent", 1n << 18n],
  ["GatewayMessageContentLimited", 1n << 19n],
  ["ApplicationCommandBadge", 1n << 23n],
] as const);

export type ApplicationFlag = HashMap.HashMap.Key<typeof ApplicationFlag>;

const flags = BitSet.make("ApplicationBitSet", ApplicationFlag);

export const ApplicationBitSet = flags.BitSet;
export type ApplicationBitSet = InstanceType<typeof ApplicationBitSet>;

export const ApplicationFlags = flags.fromNumber;
export type ApplicationFlags = typeof ApplicationFlags.Type;

export const ApplicationFlagsNew = flags.fromString;
export type ApplicationFlagsNew = typeof ApplicationFlagsNew.Type;
