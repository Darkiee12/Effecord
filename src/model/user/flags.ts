import { HashMap } from "effect";
import * as BitSet from "@/util/bitset";
const _UserFlag = HashMap.fromIterable([
  ["Staff", 1 << 0],
  ["Partner", 1 << 1],
  ["HypeSquad", 1 << 2],
  ["BugHunterLevel1", 1 << 3],
  ["HypeSquadBravery", 1 << 6],
  ["HypeSquadBrilliance", 1 << 7],
  ["HypeSquadBalance", 1 << 8],
  ["PremiumEarlySupporter", 1 << 9],
  ["TeamPseudoUser", 1 << 10],
  ["BugHunterLevel2", 1 << 14],
  ["VerifiedBot", 1 << 16],
  ["VerifiedDeveloper", 1 << 17],
  ["CertifiedModerator", 1 << 18],
  ["BotHttpInteractions", 1 << 19],
] as const);

export type UserFlag = HashMap.HashMap.Key<typeof _UserFlag>;

const user = BitSet.make("UserBitSet", _UserFlag);

export const UserFlag = user.BitSet;

export const UserFlags = user.fromNumber;
