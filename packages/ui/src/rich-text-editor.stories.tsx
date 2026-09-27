import {
  emptyRichTextDocument,
  type RichTextDocument,
} from "@repo/contracts/rich-text";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { expect, screen } from "storybook/test";
import { RichTextEditor } from "./rich-text-editor";
import { RichTextRenderer } from "./rich-text-renderer";
import {
  formattedRichTextDocument,
  longRichTextDocument,
} from "./rich-text.fixtures";

const meta = {
  title: "Rich Text/Editor",
  component: RichTextEditor,
  args: {
    value: emptyRichTextDocument,
    onChange: () => undefined,
  },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledEditor({
  initialValue,
  disabled = false,
}: {
  initialValue: RichTextDocument;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <RichTextEditor disabled={disabled} value={value} onChange={setValue} />
  );
}

export const Empty: Story = {
  render: () => <ControlledEditor initialValue={emptyRichTextDocument} />,
};

export const Populated: Story = {
  render: () => <ControlledEditor initialValue={formattedRichTextDocument} />,
};

export const Disabled: Story = {
  render: () => (
    <ControlledEditor disabled initialValue={formattedRichTextDocument} />
  ),
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <ControlledEditor initialValue={formattedRichTextDocument} />,
};

export const LongContent: Story = {
  render: () => <ControlledEditor initialValue={longRichTextDocument} />,
};

export const AllFormattingFeatures: Story = {
  render: () => <ControlledEditor initialValue={formattedRichTextDocument} />,
};

export const ToolbarInteraction: Story = {
  render: () => <ControlledEditor initialValue={emptyRichTextDocument} />,
  play: async ({ canvas, userEvent }) => {
    const editor = await canvas.findByRole("textbox", {
      name: "Edytor tekstu sformatowanego",
    });
    await userEvent.click(canvas.getByRole("button", { name: "Pogrubienie" }));
    await userEvent.type(editor, "Ważna informacja", { skipClick: true });
    await expect(
      canvas.getByText("Ważna informacja").closest("strong"),
    ).toBeTruthy();
  },
};

export const LinkEditorOpen: Story = {
  render: () => <ControlledEditor initialValue={formattedRichTextDocument} />,
  play: async ({ canvas, userEvent }) => {
    const editor = await canvas.findByRole("textbox", {
      name: "Edytor tekstu sformatowanego",
    });
    await userEvent.click(editor);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.click(canvas.getByRole("button", { name: "Edytuj link" }));
    // The link form is in a popover, rendered in a portal outside the canvas.
    await expect(await screen.findByLabelText("Adres linku")).toBeVisible();
  },
};

export const EditorToRenderer: Story = {
  render: function EditorToRendererStory() {
    const [value, setValue] = useState(formattedRichTextDocument);
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="editor-heading">
          <h2
            className="font-heading mb-3 text-xl font-semibold"
            id="editor-heading"
          >
            Edytor
          </h2>
          <RichTextEditor value={value} onChange={setValue} />
        </section>
        <section aria-labelledby="preview-heading">
          <h2
            className="font-heading mb-3 text-xl font-semibold"
            id="preview-heading"
          >
            Podgląd SSR-safe
          </h2>
          <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <RichTextRenderer document={value} />
          </div>
        </section>
      </div>
    );
  },
};

export const ReactHookFormController: Story = {
  render: function ReactHookFormStory() {
    const { control } = useForm<{ description: RichTextDocument }>({
      defaultValues: { description: formattedRichTextDocument },
    });
    return (
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <RichTextEditor value={field.value} onChange={field.onChange} />
        )}
      />
    );
  },
};
