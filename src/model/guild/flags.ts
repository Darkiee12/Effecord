import { HashMap } from "effect";
import * as BitSet from "@/util/bitset";

export const SystemChannelFlag = HashMap.fromIterable([
  ["SuppressJoinNotifications", 1 << 0],
  ["SuppressPremiumSubscriptions", 1 << 1],
  ["SuppressGuildReminderNotifications", 1 << 2],
  ["SuppressJoinNotificationReplies", 1 << 3],
  ["SuppressRoleSubscriptionPurchaseNotifications", 1 << 4],
  ["SuppressRoleSubscriptionPurchaseNotificationReplies", 1 << 5],
] as const);

export type SystemChannelFlag = HashMap.HashMap.Key<typeof SystemChannelFlag>;

const systemChannel = BitSet.make("SystemChannelBitSet", SystemChannelFlag);

export const SystemChannelBitSet = systemChannel.BitSet;
export type SystemChannelBitSet = InstanceType<typeof SystemChannelBitSet>;

export const SystemChannelFlags = systemChannel.fromNumber;
export type SystemChannelFlags = typeof SystemChannelFlags.Type;
