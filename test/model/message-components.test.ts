import { describe, expect, expectTypeOf, test } from "bun:test";
import { Schema } from "effect";
import {
  ActionRowComponent,
  ButtonComponent,
  CheckboxComponent,
  CheckboxGroupComponent,
  ChannelSelectComponent,
  ComponentType,
  ContainerComponent,
  FileComponent,
  FileUploadComponent,
  InteractiveButtonComponent,
  LabelComponent,
  LinkButtonComponent,
  MediaGalleryComponent,
  MentionableSelectComponent,
  MessageComponent,
  ModalComponent,
  PremiumButtonComponent,
  RadioGroupComponent,
  RoleSelectComponent,
  SectionComponent,
  SeparatorComponent,
  SeparatorSpacing,
  StringSelectComponent,
  TextDisplayComponent,
  TextInputComponent,
  ThumbnailComponent,
  UserSelectComponent,
} from "@/model/message";

describe("component types", () => {
  test("keeps documented numeric values and rejects gaps", () => {
    expect(ComponentType.enums.ActionRow).toBe(1);
    expect(ComponentType.enums.Button).toBe(2);
    expect(ComponentType.enums.Section).toBe(9);
    expect(ComponentType.enums.Container).toBe(17);
    expect(ComponentType.enums.Label).toBe(18);
    expect(ComponentType.enums.FileUpload).toBe(19);
    expect(ComponentType.enums.RadioGroup).toBe(21);
    expect(ComponentType.enums.CheckboxGroup).toBe(22);
    expect(ComponentType.enums.Checkbox).toBe(23);
    for (const wire of [0, 15, 16, 20, 24, -1, 1.5, "1", null]) {
      expect(() => Schema.decodeUnknownSync(ComponentType)(wire)).toThrow();
    }
  });
});

describe("buttons", () => {
  test("roundtrips each style variant with strict field correlation", () => {
    const interactive = { type: 2, style: 1, custom_id: "click_me", label: "Click me!" } as const;
    const decoded = Schema.decodeSync(ButtonComponent)(interactive);
    expect(Schema.encodeSync(ButtonComponent)(decoded)).toEqual(interactive);
    expectTypeOf(decoded).toExtend<
      InteractiveButtonComponent | LinkButtonComponent | PremiumButtonComponent
    >();

    const link = { type: 2, style: 5, label: "Docs", url: "https://docs.discord.com" } as const;
    expect(Schema.encodeSync(ButtonComponent)(Schema.decodeSync(ButtonComponent)(link))).toEqual(
      link,
    );

    const premium = { type: 2, style: 6, sku_id: "123" } as const;
    expect(Schema.encodeSync(ButtonComponent)(Schema.decodeSync(ButtonComponent)(premium))).toEqual(
      premium,
    );
  });

  test("rejects mismatched style/field combinations", () => {
    // Interactive styles require custom_id.
    expect(() =>
      Schema.decodeUnknownSync(ButtonComponent)({ type: 2, style: 1, label: "x" }),
    ).toThrow();
    // Link buttons require url.
    expect(() =>
      Schema.decodeUnknownSync(ButtonComponent)({ type: 2, style: 5, custom_id: "x" }),
    ).toThrow();
    // Premium buttons require sku_id.
    expect(() =>
      Schema.decodeUnknownSync(ButtonComponent)({ type: 2, style: 6, custom_id: "x" }),
    ).toThrow();
    // Unknown styles are rejected.
    expect(() =>
      Schema.decodeUnknownSync(ButtonComponent)({ type: 2, style: 7, custom_id: "x" }),
    ).toThrow();
  });
});

describe("selects", () => {
  test("roundtrips a string select with options", () => {
    const wire = {
      type: 3,
      custom_id: "favorite_bug",
      placeholder: "Favorite bug?",
      options: [
        { label: "Ant", value: "ant", description: "(best option)", emoji: { name: "🐜" } },
        { label: "Butterfly", value: "butterfly" },
      ],
    } as const;
    const select = Schema.decodeSync(StringSelectComponent)(wire);
    expect(select.options[0]?.emoji?.name).toBe("🐜");
    expect(Schema.encodeSync(StringSelectComponent)(select)).toEqual(wire);
  });

  test("rejects option lists over the 25-option cap", () => {
    const options = Array.from({ length: 26 }, (_, i) => ({ label: `l${i}`, value: `v${i}` }));
    expect(() =>
      Schema.decodeSync(StringSelectComponent)({ type: 3, custom_id: "x", options }),
    ).toThrow();
  });

  test("roundtrips entity and channel selects", () => {
    for (const [schema, wire] of [
      [UserSelectComponent, { type: 5, custom_id: "u" }],
      [RoleSelectComponent, { type: 6, custom_id: "r", min_values: 1, max_values: 3 }],
      [MentionableSelectComponent, { type: 7, custom_id: "m" }],
      [ChannelSelectComponent, { type: 8, custom_id: "c", channel_types: [0] }],
    ] as const) {
      expect(Schema.encodeSync(schema)(Schema.decodeSync(schema)(wire))).toEqual(wire);
    }
    expect(() =>
      Schema.decodeUnknownSync(ChannelSelectComponent)({ type: 8, custom_id: "c", custom: 1 }),
    ).not.toThrow();
  });
});

describe("layout and content components", () => {
  test("roundtrips an action row of buttons", () => {
    const wire = {
      type: 1,
      components: [
        { type: 2, style: 1, custom_id: "yes", label: "Accept" },
        { type: 2, style: 5, label: "Learn more", url: "https://example.com" },
      ],
    } as const;
    const row = Schema.decodeSync(ActionRowComponent)(wire);
    expect(row.components.length).toBe(2);
    expect(Schema.encodeSync(ActionRowComponent)(row)).toEqual(wire);
  });

  test("rejects action rows over the 5-child cap", () => {
    const components = Array.from({ length: 6 }, (_, i) => ({
      type: 2,
      style: 1,
      custom_id: `b${i}`,
    }));
    expect(() => Schema.decodeUnknownSync(ActionRowComponent)({ type: 1, components })).toThrow();
  });

  test("roundtrips a section with text and thumbnail accessory", () => {
    const wire = {
      type: 9,
      components: [{ type: 10, content: "# Changelog" }],
      accessory: { type: 11, media: { url: "https://example.com/preview.webp" } },
    } as const;
    expect(Schema.encodeSync(SectionComponent)(Schema.decodeSync(SectionComponent)(wire))).toEqual(
      wire,
    );
  });

  test("roundtrips container nesting with mixed children", () => {
    const wire = {
      type: 17,
      accent_color: 703487,
      components: [
        { type: 10, content: "# Encounter" },
        {
          type: 12,
          items: [{ media: { url: "https://example.com/coyote.webp" }, description: null }],
        },
        { type: 14, divider: true, spacing: 1 },
        {
          type: 1,
          components: [{ type: 2, style: 4, custom_id: "run", label: "Run away!" }],
        },
      ],
    } as const;
    const container = Schema.decodeSync(ContainerComponent)(wire);
    expect(container.accentColor).toBe(703487);
    expect(Schema.encodeSync(ContainerComponent)(container)).toEqual(wire);
    expectTypeOf<NonNullable<SeparatorComponent["spacing"]>>().toEqualTypeOf<SeparatorSpacing>();
  });

  test("rejects empty media galleries", () => {
    expect(() => Schema.decodeSync(MediaGalleryComponent)({ type: 12, items: [] })).toThrow();
  });

  test("roundtrips file and thumbnail components", () => {
    const file = { type: 13, file: { url: "attachment://game.zip" } } as const;
    expect(Schema.encodeSync(FileComponent)(Schema.decodeSync(FileComponent)(file))).toEqual(file);
    const thumbnail = Schema.decodeSync(ThumbnailComponent)({
      type: 11,
      media: { url: "https://example.com/t.webp" },
      spoiler: true,
    });
    expect(thumbnail.spoiler).toBe(true);
    expectTypeOf<ThumbnailComponent["description"]>().toEqualTypeOf<string | null | undefined>();
  });
});

describe("modal components", () => {
  test("roundtrips a label wrapping text input", () => {
    const wire = {
      type: 18,
      label: "Feedback",
      description: "Be honest",
      component: { type: 4, custom_id: "feedback", style: 2, required: true },
    } as const;
    const label = Schema.decodeSync(LabelComponent)(wire);
    expect(Schema.encodeSync(LabelComponent)(label)).toEqual(wire);
    if (label.component.type === 4) {
      expectTypeOf(label.component).toEqualTypeOf<TextInputComponent>();
    } else {
      throw new Error("Expected TextInput");
    }
  });

  test("roundtrips file upload, radio group, checkbox group, checkbox", () => {
    for (const [schema, wire] of [
      [FileUploadComponent, { type: 19, custom_id: "f", max_values: 10 }],
      [
        RadioGroupComponent,
        {
          type: 21,
          custom_id: "class",
          options: [
            { value: "warrior", label: "Warrior" },
            { value: "mage", label: "Mage" },
          ],
        },
      ],
      [
        CheckboxGroupComponent,
        {
          type: 22,
          custom_id: "days",
          options: [{ value: "mon", label: "Monday" }],
        },
      ],
      [CheckboxComponent, { type: 23, custom_id: "like", default: true }],
    ] as const) {
      expect(Schema.encodeSync(schema)(Schema.decodeSync(schema)(wire))).toEqual(wire);
    }
    // Radio groups require at least 2 options.
    expect(() =>
      Schema.decodeSync(RadioGroupComponent)({
        type: 21,
        custom_id: "x",
        options: [{ value: "a", label: "A" }],
      }),
    ).toThrow();
  });
});

describe("message component unions", () => {
  test("dispatches on type and narrows variants", () => {
    const text = Schema.decodeSync(MessageComponent)({ type: 10, content: "hi" });
    if (text.type === 10) {
      expectTypeOf(text).toEqualTypeOf<TextDisplayComponent>();
      expect(text.content).toBe("hi");
    } else {
      throw new Error("Expected TextDisplay");
    }
    expect(() =>
      Schema.decodeUnknownSync(MessageComponent)({ type: 10, custom_id: "x" }),
    ).toThrow();
    expect(() => Schema.decodeUnknownSync(MessageComponent)({ type: 15 })).toThrow();
  });

  test("excludes modal-only components from messages", () => {
    const label = {
      type: 18,
      label: "L",
      component: { type: 4, custom_id: "x", style: 1 },
    } as const;
    expect(() => Schema.decodeUnknownSync(MessageComponent)(label)).toThrow();
    expect(Schema.encodeSync(ModalComponent)(Schema.decodeSync(ModalComponent)(label))).toEqual(
      label,
    );
  });
});
