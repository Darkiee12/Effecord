import { Schema, HashMap } from "effect";

export const PremiumType = Schema.Literals([0, 1, 2, 3]);

export type PremiumType = typeof PremiumType.Type;

const names: HashMap.HashMap<PremiumType, string> = HashMap.fromIterable([
  [0, "None"],
  [1, "NitroClassic"],
  [2, "Nitro"],
  [3, "NitroBasic"],
] as const);

export const getName = (type: PremiumType): string => HashMap.getUnsafe(names, type);

export const isPremium = (type: PremiumType): boolean => type !== 0;
