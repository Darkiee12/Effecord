import {
  PrivateChannelTags,
  type GatewayChannel,
  type GuildChannel,
  type KnownChannel,
  type PrivateChannel,
} from "./channel";

type ChannelTag = KnownChannel["_tag"];

type SelectChannel<Tags extends ReadonlyArray<ChannelTag>> = Extract<
  KnownChannel,
  {
    readonly _tag: Tags[number];
  }
>;

const makeGuard = <const Tags extends ReadonlyArray<ChannelTag>>(tags: Tags) => {
  const accepted = new Set<string>(tags);

  return (channel: GatewayChannel): channel is SelectChannel<Tags> => accepted.has(channel._tag);
};

// Channel identity

export const isKnownChannel = (channel: GatewayChannel): channel is KnownChannel =>
  channel._tag !== "Unknown" && channel._tag !== "Obfuscated";

export const isPrivateChannel = makeGuard(PrivateChannelTags);

export const isGuildChannel = (channel: GatewayChannel): channel is GuildChannel =>
  isKnownChannel(channel) && !isPrivateChannel(channel);

// Message capability

export const MessageChannelTags = [
  "GuildText",
  "DM",
  "GuildVoice",
  "GroupDM",
  "GuildAnnouncement",
  "AnnouncementThread",
  "PublicThread",
  "PrivateThread",
  "GuildStage",
] as const satisfies ReadonlyArray<ChannelTag>;

export type MessageChannel = SelectChannel<typeof MessageChannelTags>;

export const isMessageChannel = makeGuard(MessageChannelTags);

export const isSendable = isMessageChannel;

// Thread capability

export const ThreadChannelTags = [
  "AnnouncementThread",
  "PublicThread",
  "PrivateThread",
] as const satisfies ReadonlyArray<ChannelTag>;

export type ThreadChannel = SelectChannel<typeof ThreadChannelTags>;

export const isThreadChannel = makeGuard(ThreadChannelTags);

// Creating a thread from an existing message

export const ThreadParentChannelTags = [
  "GuildText",
  "GuildAnnouncement",
] as const satisfies ReadonlyArray<ChannelTag>;

export type ThreadParentChannel = SelectChannel<typeof ThreadParentChannelTags>;

export const isThreadParentChannel = makeGuard(ThreadParentChannelTags);

// Creating a standalone thread

export const StandaloneThreadParentChannelTags = [
  "GuildText",
] as const satisfies ReadonlyArray<ChannelTag>;

export type StandaloneThreadParentChannel = SelectChannel<typeof StandaloneThreadParentChannelTags>;

export const isStandaloneThreadParentChannel = makeGuard(StandaloneThreadParentChannelTags);

// Creating forum/media posts

export const ForumParentChannelTags = [
  "GuildForum",
  "GuildMedia",
] as const satisfies ReadonlyArray<ChannelTag>;

export type ForumParentChannel = SelectChannel<typeof ForumParentChannelTags>;

export const isForumParentChannel = makeGuard(ForumParentChannelTags);

// Connecting to voice

export const VoiceConnectableChannelTags = [
  "GuildVoice",
  "GuildStage",
] as const satisfies ReadonlyArray<ChannelTag>;

export type VoiceConnectableChannel = SelectChannel<typeof VoiceConnectableChannelTags>;

export const isVoiceConnectableChannel = makeGuard(VoiceConnectableChannelTags);
