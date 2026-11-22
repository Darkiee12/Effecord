import { Schema, type Types } from "effect";

export const ChannelType = Schema.Int;
export type ChannelType = typeof ChannelType.Type;

/** The single source of truth for channel names and their wire discriminators. */
export const KnownChannelType = Schema.Enum({
  GuildText: 0,
  DM: 1,
  GuildVoice: 2,
  GroupDM: 3,
  GuildCategory: 4,
  GuildAnnouncement: 5,
  AnnouncementThread: 10,
  PublicThread: 11,
  PrivateThread: 12,
  GuildStage: 13,
  GuildDirectory: 14,
  GuildForum: 15,
  GuildMedia: 16,
});
export type KnownChannelType = typeof KnownChannelType.Type;
export type KnownChannelName = keyof typeof KnownChannelType.enums;

export const isKnown = Schema.is(KnownChannelType);

/** Require one name: a union would lose the correlation between the two fields. */
export const known = <const N extends KnownChannelName>(
  name: N & (Types.IsUnion<N> extends true ? never : unknown),
) => ({
  _tag: Schema.tagDefaultOmit<N>(name),
  type: Schema.Literal(KnownChannelType.enums[name]),
});

/** Future integer types must not let malformed known channels bypass validation. */
export const UnknownChannelType = ChannelType.check(
  Schema.makeFilter((type) => !isKnown(type) || "Expected an unknown channel type"),
).pipe(Schema.brand("UnknownChannelType"));
export type UnknownChannelType = typeof UnknownChannelType.Type;
