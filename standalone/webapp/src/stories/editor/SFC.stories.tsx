import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  ApollonEditable,
  ApollonFixture,
  fixtureByType,
  EditorStoreDecorator,
  ElementGallery,
  EdgeGallery,
} from "../_support/editor"

/**
 * **SFC** (Sequential Function Chart) — everything in one place. `Playground`
 * is the real, editable editor (palette, selection, edit popups) loaded with a
 * sample; `Blank` is an empty editable canvas; `Preview` is a read-only render;
 * `Elements` / `Edges` are galleries of every shape / connector. Edit popovers
 * live under Popovers/. Use the toolbar to switch light / dark. Tagged `!test`
 * (editor source = a 2nd React copy under the Vitest runner) — these are
 * visual; browse them here.
 */
const meta = {
  title: "Editor/SFC",
  tags: ["autodocs", "!test"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The real, editable editor + palette, pre-loaded with a sample to edit. */
export const Playground: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable model={fixtureByType.Sfc} />,
}

/** Editable blank canvas — build an SFC from the palette. */
export const Blank: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonEditable type="Sfc" />,
}

/** Read-only render of a populated diagram (clean visual reference). */
export const Preview: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <ApollonFixture model={fixtureByType.Sfc} />,
}

/** Every node shape this diagram can contain. */
export const Elements: Story = {
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  render: () => <ElementGallery type="Sfc" />,
}

/** Every transition (edge) type, with its marker + dash style. */
export const Edges: Story = {
  parameters: { layout: "centered" },
  render: () => <EdgeGallery family="Sfc" />,
}
