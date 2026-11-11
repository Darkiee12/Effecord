import { HashMap } from "effect";
import * as BitSet from "@/util/bitset";

// https://docs.discord.com/developers/resources/message#message-object-message-flags
// Verified: gaps at 1<<9, 1<<10, 1<<11 are unassigned in current docs.
export const MessageFlag = HashMap.fromIterable([
  ["Crossposted", 1 << 0],
  ["IsCrosspost", 1 << 1],
  ["SuppressEmbeds", 1 << 2],
  ["SourceMessageDeleted", 1 << 3],
  ["Urgent", 1 << 4],
  ["HasThread", 1 << 5],
  ["Ephemeral", 1 << 6],
  ["Loading", 1 << 7],
  ["FailedToMentionSomeRolesInThread", 1 << 8],
  ["SuppressNotifications", 1 << 12],
  ["IsVoiceMessage", 1 << 13],
  ["HasSnapshot", 1 << 14],
  ["IsComponentsV2", 1 << 15],
] as const);

export type MessageFlag = HashMap.HashMap.Key<typeof MessageFlag>;

const message = BitSet.make("MessageBitSet", MessageFlag);

export const MessageBitSet = message.BitSet;
export type MessageBitSet = InstanceType<typeof MessageBitSet>;

// Message flags travel as JSON numbers on the wire.
export const MessageFlags = message.fromNumber;
export type MessageFlags = typeof MessageFlags.Type;
