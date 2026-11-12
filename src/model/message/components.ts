import { HashMap, Schema } from "effect";
import * as Snowflake from "@/model/snowflake";
import { EmojiId } from "@/model/emoji";
import { SkuId } from "@/model/user";
import { AttachmentId } from "./attachment";
import * as BitSet from "@/util/bitset";

// https://docs.discord.com/developers/components/reference#component-object-component-types
// Values 15, 16, 20 are unassigned in current docs. Strict: unknown integers
// are rejected; extend this enum when Discord assigns them.
export const ComponentType = Schema.Enum({
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  TextInput: 4,
  UserSelect: 5,
  RoleSelect: 6,
  MentionableSelect: 7,
  ChannelSelect: 8,
  Section: 9,
  TextDisplay: 10,
  Thumbnail: 11,
  MediaGallery: 12,
  File: 13,
  Separator: 14,
  Container: 17,
  Label: 18,
  FileUpload: 19,
  RadioGroup: 21,
  CheckboxGroup: 22,
  Checkbox: 23,
});
export type ComponentType = typeof ComponentType.Type;

// https://docs.discord.com/developers/components/reference#button-button-styles
export const ButtonStyle = Schema.Enum({
  Primary: 1,
  Secondary: 2,
  Success: 3,
  Danger: 4,
  Link: 5,
  Premium: 6,
});
export type ButtonStyle = typeof ButtonStyle.Type;

// https://docs.discord.com/developers/components/reference#text-input-text-input-styles
export const TextInputStyle = Schema.Enum({
  Short: 1,
  Paragraph: 2,
});
export type TextInputStyle = typeof TextInputStyle.Type;

// https://docs.discord.com/developers/components/reference#separator-structure
export const SeparatorSpacing = Schema.Enum({
  Small: 1,
  Large: 2,
});
export type SeparatorSpacing = typeof SeparatorSpacing.Type;

// Partial emoji as it appears on components: every field optional.
export const PartialComponentEmoji = Schema.Struct({
  id: Schema.optionalKey(Schema.NullOr(EmojiId)),
  name: Schema.optionalKey(Schema.NullOr(Schema.String)),
  animated: Schema.optionalKey(Schema.Boolean),
});
export type PartialComponentEmoji = typeof PartialComponentEmoji.Type;

// https://docs.discord.com/developers/components/reference#user-select-select-default-value-structure
// The id may reference a user, role, or channel, so it stays a plain Snowflake.
export const SelectDefaultValue = Schema.Struct({
  id: Snowflake.fromString,
  type: Schema.Literals(["user", "role", "channel"]),
});
export type SelectDefaultValue = typeof SelectDefaultValue.Type;

// https://docs.discord.com/developers/components/reference#string-select-select-option-structure
export const SelectOption = Schema.Struct({
  label: Schema.String,
  value: Schema.String,
  description: Schema.optionalKey(Schema.String),
  emoji: Schema.optionalKey(PartialComponentEmoji),
  default: Schema.optionalKey(Schema.Boolean),
});
export type SelectOption = typeof SelectOption.Type;

const selectKeys = {
  customId: "custom_id",
  defaultValues: "default_values",
  minValues: "min_values",
  maxValues: "max_values",
} as const;

const entitySelectFields = {
  placeholder: Schema.optionalKey(Schema.String),
  defaultValues: Schema.optionalKey(Schema.Array(SelectDefaultValue)),
  minValues: Schema.optionalKey(Schema.Int),
  maxValues: Schema.optionalKey(Schema.Int),
  required: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
};

// Buttons correlate style with required field: interactive styles require
// custom_id, Link requires url, Premium requires sku_id. Structs strip
// unlisted keys on decode, so "must not have" is documented, not enforced.
const buttonBaseFields = {
  label: Schema.optionalKey(Schema.String),
  emoji: Schema.optionalKey(PartialComponentEmoji),
  disabled: Schema.optionalKey(Schema.Boolean),
};

export const InteractiveButtonComponent = Schema.Struct({
  ...buttonBaseFields,
  type: Schema.Literal(2),
  style: Schema.Literals([1, 2, 3, 4]),
  customId: Schema.String,
  id: Schema.optionalKey(Schema.Int),
}).pipe(
  Schema.encodeKeys({
    customId: "custom_id",
  }),
);
export type InteractiveButtonComponent = typeof InteractiveButtonComponent.Type;

export const LinkButtonComponent = Schema.Struct({
  ...buttonBaseFields,
  type: Schema.Literal(2),
  style: Schema.Literal(5),
  url: Schema.String,
  id: Schema.optionalKey(Schema.Int),
});
export type LinkButtonComponent = typeof LinkButtonComponent.Type;

export const PremiumButtonComponent = Schema.Struct({
  ...buttonBaseFields,
  type: Schema.Literal(2),
  style: Schema.Literal(6),
  skuId: SkuId,
  id: Schema.optionalKey(Schema.Int),
}).pipe(
  Schema.encodeKeys({
    skuId: "sku_id",
  }),
);
export type PremiumButtonComponent = typeof PremiumButtonComponent.Type;

export const ButtonComponent = Schema.Union([
  InteractiveButtonComponent,
  LinkButtonComponent,
  PremiumButtonComponent,
]);
export type ButtonComponent = typeof ButtonComponent.Type;

// https://docs.discord.com/developers/components/reference#string-select-structure
export const StringSelectComponent = Schema.Struct({
  type: Schema.Literal(3),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  options: Schema.Array(SelectOption).check(Schema.isMaxLength(25)),
  placeholder: Schema.optionalKey(Schema.String),
  minValues: Schema.optionalKey(Schema.Int),
  maxValues: Schema.optionalKey(Schema.Int),
  required: Schema.optionalKey(Schema.Boolean),
  disabled: Schema.optionalKey(Schema.Boolean),
}).pipe(Schema.encodeKeys(selectKeys));
export type StringSelectComponent = typeof StringSelectComponent.Type;

// https://docs.discord.com/developers/components/reference#user-select-structure
export const UserSelectComponent = Schema.Struct({
  type: Schema.Literal(5),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  ...entitySelectFields,
}).pipe(Schema.encodeKeys(selectKeys));
export type UserSelectComponent = typeof UserSelectComponent.Type;

// https://docs.discord.com/developers/components/reference#role-select-structure
export const RoleSelectComponent = Schema.Struct({
  type: Schema.Literal(6),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  ...entitySelectFields,
}).pipe(Schema.encodeKeys(selectKeys));
export type RoleSelectComponent = typeof RoleSelectComponent.Type;

// https://docs.discord.com/developers/components/reference#mentionable-select-structure
export const MentionableSelectComponent = Schema.Struct({
  type: Schema.Literal(7),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  ...entitySelectFields,
}).pipe(Schema.encodeKeys(selectKeys));
export type MentionableSelectComponent = typeof MentionableSelectComponent.Type;

// https://docs.discord.com/developers/components/reference#channel-select-structure
export const ChannelSelectComponent = Schema.Struct({
  type: Schema.Literal(8),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  // TODO: correlate with KnownChannelType once the channel import surface
  // allows more than ChannelId/MessageId. Plain ints for now.
  channelTypes: Schema.optionalKey(Schema.Array(Schema.Int)),
  ...entitySelectFields,
}).pipe(
  Schema.encodeKeys({
    ...selectKeys,
    channelTypes: "channel_types",
  }),
);
export type ChannelSelectComponent = typeof ChannelSelectComponent.Type;

// https://docs.discord.com/developers/components/reference#text-input-structure
export const TextInputComponent = Schema.Struct({
  type: Schema.Literal(4),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  style: TextInputStyle,
  minLength: Schema.optionalKey(Schema.Int),
  maxLength: Schema.optionalKey(Schema.Int),
  required: Schema.optionalKey(Schema.Boolean),
  value: Schema.optionalKey(Schema.String),
  placeholder: Schema.optionalKey(Schema.String),
}).pipe(
  Schema.encodeKeys({
    customId: "custom_id",
    minLength: "min_length",
    maxLength: "max_length",
  }),
);
export type TextInputComponent = typeof TextInputComponent.Type;

// https://docs.discord.com/developers/components/reference#file-upload-structure
export const FileUploadComponent = Schema.Struct({
  type: Schema.Literal(19),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  minValues: Schema.optionalKey(Schema.Int),
  maxValues: Schema.optionalKey(Schema.Int),
  required: Schema.optionalKey(Schema.Boolean),
  fileTypes: Schema.optionalKey(Schema.Array(Schema.String).check(Schema.isMaxLength(10))),
}).pipe(
  Schema.encodeKeys({
    customId: "custom_id",
    minValues: "min_values",
    maxValues: "max_values",
    fileTypes: "file_types",
  }),
);
export type FileUploadComponent = typeof FileUploadComponent.Type;

const choiceOptionFields = {
  value: Schema.String,
  label: Schema.String,
  description: Schema.optionalKey(Schema.String),
  default: Schema.optionalKey(Schema.Boolean),
};

// https://docs.discord.com/developers/components/reference#radio-group-option-structure
export const RadioGroupOption = Schema.Struct(choiceOptionFields);
export type RadioGroupOption = typeof RadioGroupOption.Type;

// https://docs.discord.com/developers/components/reference#radio-group-structure
export const RadioGroupComponent = Schema.Struct({
  type: Schema.Literal(21),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  options: Schema.Array(RadioGroupOption).check(Schema.isMinLength(2), Schema.isMaxLength(10)),
  required: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    customId: "custom_id",
  }),
);
export type RadioGroupComponent = typeof RadioGroupComponent.Type;

// https://docs.discord.com/developers/components/reference#checkbox-group-option-structure
export const CheckboxGroupOption = Schema.Struct(choiceOptionFields);
export type CheckboxGroupOption = typeof CheckboxGroupOption.Type;

// https://docs.discord.com/developers/components/reference#checkbox-group-structure
export const CheckboxGroupComponent = Schema.Struct({
  type: Schema.Literal(22),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  options: Schema.Array(CheckboxGroupOption).check(Schema.isMinLength(1), Schema.isMaxLength(10)),
  minValues: Schema.optionalKey(Schema.Int),
  maxValues: Schema.optionalKey(Schema.Int),
  required: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    customId: "custom_id",
    minValues: "min_values",
    maxValues: "max_values",
  }),
);
export type CheckboxGroupComponent = typeof CheckboxGroupComponent.Type;

// https://docs.discord.com/developers/components/reference#checkbox-structure
export const CheckboxComponent = Schema.Struct({
  type: Schema.Literal(23),
  id: Schema.optionalKey(Schema.Int),
  customId: Schema.String,
  default: Schema.optionalKey(Schema.Boolean),
}).pipe(
  Schema.encodeKeys({
    customId: "custom_id",
  }),
);
export type CheckboxComponent = typeof CheckboxComponent.Type;

// Label wraps exactly one modal child component.
// https://docs.discord.com/developers/components/reference#label-structure
export const LabelChildComponent = Schema.Union([
  TextInputComponent,
  StringSelectComponent,
  UserSelectComponent,
  RoleSelectComponent,
  MentionableSelectComponent,
  ChannelSelectComponent,
  FileUploadComponent,
  RadioGroupComponent,
  CheckboxGroupComponent,
  CheckboxComponent,
]);
export type LabelChildComponent = typeof LabelChildComponent.Type;

export const LabelComponent = Schema.Struct({
  type: Schema.Literal(18),
  id: Schema.optionalKey(Schema.Int),
  label: Schema.String,
  description: Schema.optionalKey(Schema.String),
  component: LabelChildComponent,
});
export type LabelComponent = typeof LabelComponent.Type;

// https://docs.discord.com/developers/components/reference#unfurled-media-item-structure
export const UnfurledMediaFlag = HashMap.fromIterable([["IsAnimated", 1 << 0]] as const);

export type UnfurledMediaFlag = HashMap.HashMap.Key<typeof UnfurledMediaFlag>;

const unfurledMedia = BitSet.make("UnfurledMediaBitSet", UnfurledMediaFlag);

export const UnfurledMediaBitSet = unfurledMedia.BitSet;
export type UnfurledMediaBitSet = InstanceType<typeof UnfurledMediaBitSet>;

export const UnfurledMediaFlags = unfurledMedia.fromNumber;
export type UnfurledMediaFlags = typeof UnfurledMediaFlags.Type;

// https://docs.discord.com/developers/components/reference#unfurled-media-item-content-scan-metadata-flags
export const ContentScanMetadataFlag = HashMap.fromIterable([
  ["IsExplicitContent", 1 << 0],
  ["IsGoreContent", 1 << 1],
  ["IsSelfHarmContent", 1 << 2],
] as const);

export type ContentScanMetadataFlag = HashMap.HashMap.Key<typeof ContentScanMetadataFlag>;

const contentScanMetadata = BitSet.make("ContentScanMetadataBitSet", ContentScanMetadataFlag);

export const ContentScanMetadataBitSet = contentScanMetadata.BitSet;
export type ContentScanMetadataBitSet = InstanceType<typeof ContentScanMetadataBitSet>;

export const ContentScanMetadataFlags = contentScanMetadata.fromNumber;
export type ContentScanMetadataFlags = typeof ContentScanMetadataFlags.Type;

export const ContentScanMetadata = Schema.Struct({
  flags: ContentScanMetadataFlags,
});
export type ContentScanMetadata = typeof ContentScanMetadata.Type;

export const UnfurledMediaItem = Schema.Struct({
  url: Schema.String,
  proxyUrl: Schema.optionalKey(Schema.String),
  height: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  width: Schema.optionalKey(Schema.NullOr(Schema.Int)),
  placeholder: Schema.optionalKey(Schema.String),
  placeholderVersion: Schema.optionalKey(Schema.Int),
  contentType: Schema.optionalKey(Schema.String),
  flags: Schema.optionalKey(UnfurledMediaFlags),
  contentScanMetadata: Schema.optionalKey(ContentScanMetadata),
  attachmentId: Schema.optionalKey(AttachmentId),
}).pipe(
  Schema.encodeKeys({
    proxyUrl: "proxy_url",
    placeholderVersion: "placeholder_version",
    contentType: "content_type",
    contentScanMetadata: "content_scan_metadata",
    attachmentId: "attachment_id",
  }),
);
export type UnfurledMediaItem = typeof UnfurledMediaItem.Type;

// Modal-only components: Label plus everything it can wrap.
export const ModalComponent = Schema.Union([LabelComponent, LabelChildComponent]);
export type ModalComponent = typeof ModalComponent.Type;
