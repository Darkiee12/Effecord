import { HashMap } from "effect";
import * as BitSet from "@/util/bitset";

export const RoleFlag = HashMap.fromIterable([["InPrompt", 1 << 0]] as const);
export type RoleFlag = HashMap.HashMap.Key<typeof RoleFlag>;

const role = BitSet.make("RoleBitSet", RoleFlag);

export const RoleBitSet = role.BitSet;
export type RoleBitSet = InstanceType<typeof RoleBitSet>;

export const RoleFlags = role.fromNumber;
export type RoleFlags = typeof RoleFlags.Type;
