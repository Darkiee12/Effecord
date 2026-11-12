import { Schema } from "effect";
import {
  ButtonComponent,
  ChannelSelectComponent,
  MentionableSelectComponent,
  RoleSelectComponent,
  SeparatorSpacing,
  StringSelectComponent,
  UnfurledMediaItem,
  UserSelectComponent,
} from "./components";

// Layout and content components for Components V2 messages.
// https://docs.discord.com/developers/components/reference

// https://docs.discord.com/developers/components/reference#action-row-structure
// An Action Row holds up to 5 buttons or a single select.
export const ActionRowChildComponent = Schema.Union([
  ButtonComponent,
  StringSelectComponent,
  UserSelectComponent,
  RoleSelectComponent,
  MentionableSelectComponent,
  ChannelSelectComponent,
]);
export type ActionRowChildComponent = typeof ActionRowChildComponent.Type;

export const ActionRowComponent = Schema.Struct({
  type: Schema.Literal(1),
  id: Schema.optionalKey(Schema.Int),
  components: Schema.Array(ActionRowChildComponent).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(5),
  ),
});
export type ActionRowComponent = typeof ActionRowComponent.Type;

// https://docs.discord.com/developers/components/reference#text-display-structure
export const TextDisplayComponent = Schema.Struct({
  type: Schema.Literal(10),
  id: Schema.optionalKey(Schema.Int),
  content: Schema.String,
});
export type TextDisplayComponent = typeof TextDisplayComponent.Type;

// https://docs.discord.com/developers/components/reference#thumbnail-structure
export const ThumbnailComponent = Schema.Struct({
  type: Schema.Literal(11),
  id: Schema.optionalKey(Schema.Int),
  media: UnfurledMediaItem,
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  spoiler: Schema.optionalKey(Schema.Boolean),
});
export type ThumbnailComponent = typeof ThumbnailComponent.Type;

// https://docs.discord.com/developers/components/reference#section-structure
// Docs advise against hardcoding section children to text only, but Text
// Display is the only documented child today; strict until Discord adds more.
export const SectionComponent = Schema.Struct({
  type: Schema.Literal(9),
  id: Schema.optionalKey(Schema.Int),
  components: Schema.Array(TextDisplayComponent).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(3),
  ),
  accessory: Schema.Union([ButtonComponent, ThumbnailComponent]),
});
export type SectionComponent = typeof SectionComponent.Type;

// https://docs.discord.com/developers/components/reference#media-gallery-item-structure
export const MediaGalleryItem = Schema.Struct({
  media: UnfurledMediaItem,
  description: Schema.optionalKey(Schema.NullOr(Schema.String)),
  spoiler: Schema.optionalKey(Schema.Boolean),
});
export type MediaGalleryItem = typeof MediaGalleryItem.Type;

// https://docs.discord.com/developers/components/reference#media-gallery-structure
export const MediaGalleryComponent = Schema.Struct({
  type: Schema.Literal(12),
  id: Schema.optionalKey(Schema.Int),
  items: Schema.Array(MediaGalleryItem).check(Schema.isMinLength(1), Schema.isMaxLength(10)),
});
export type MediaGalleryComponent = typeof MediaGalleryComponent.Type;

// https://docs.discord.com/developers/components/reference#file-structure
export const FileComponent = Schema.Struct({
  type: Schema.Literal(13),
  id: Schema.optionalKey(Schema.Int),
  file: UnfurledMediaItem,
  spoiler: Schema.optionalKey(Schema.Boolean),
  name: Schema.optionalKey(Schema.String),
  size: Schema.optionalKey(Schema.Int),
});
export type FileComponent = typeof FileComponent.Type;

// https://docs.discord.com/developers/components/reference#separator-structure
export const SeparatorComponent = Schema.Struct({
  type: Schema.Literal(14),
  id: Schema.optionalKey(Schema.Int),
  divider: Schema.optionalKey(Schema.Boolean),
  spacing: Schema.optionalKey(SeparatorSpacing),
});
export type SeparatorComponent = typeof SeparatorComponent.Type;

// https://docs.discord.com/developers/components/reference#container-structure
export const ContainerChildComponent = Schema.Union([
  ActionRowComponent,
  TextDisplayComponent,
  SectionComponent,
  MediaGalleryComponent,
  SeparatorComponent,
  FileComponent,
]);
export type ContainerChildComponent = typeof ContainerChildComponent.Type;

export const ContainerComponent = Schema.Struct({
  type: Schema.Literal(17),
  id: Schema.optionalKey(Schema.Int),
  components: Schema.Array(ContainerChildComponent),
  accentColor: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  spoiler: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    accentColor: "accent_color",
  }),
);
export type ContainerComponent = typeof ContainerComponent.Type;

// Every component allowed in a message (top level or nested). Modal-only
// components (Label, TextInput, FileUpload, RadioGroup, CheckboxGroup,
// Checkbox) are excluded; see ModalComponent in ./components.
export const MessageComponent = Schema.Union([
  ActionRowComponent,
  ButtonComponent,
  StringSelectComponent,
  UserSelectComponent,
  RoleSelectComponent,
  MentionableSelectComponent,
  ChannelSelectComponent,
  SectionComponent,
  TextDisplayComponent,
  ThumbnailComponent,
  MediaGalleryComponent,
  FileComponent,
  SeparatorComponent,
  ContainerComponent,
]);
export type MessageComponent = typeof MessageComponent.Type;
