import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  EditorStoreDecorator,
  ElementPreview,
  elementConfigsFor,
} from "../_support/editor"

/**
 * The individual SFC (sequential function chart) element renderers (the SVGs the
 * Sidebar shows as drag ghosts), each in isolation. Smoke-validates the
 * store-decorator path that the per-family element galleries build on.
 */
const meta = {
  title: "Editor/Elements/SFC",
  component: ElementPreview,
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  // `!test`: the SVG renderers import editor source, which pulls a second React
  // copy under the Vitest browser runner. Visual-only — browse in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta<typeof ElementPreview>

export default meta
type Story = StoryObj<typeof meta>

const configs = elementConfigsFor("Sfc")

/** All SFC element shapes laid out together. */
export const AllElements: Story = {
  args: { config: configs[0] },
  render: () => (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "flex-start",
      }}
    >
      {configs.map((config, i) => (
        <ElementPreview key={`${config.type}-${i}`} config={config} />
      ))}
    </div>
  ),
}

/** The same gallery pinned to the dark theme. */
export const AllElementsDark: Story = {
  ...AllElements,
  globals: { theme: "dark" },
}

export const Start: Story = { args: { config: configs[0] } }
export const Step: Story = { args: { config: configs[1] } }
export const Jump: Story = { args: { config: configs[2] } }
export const TransitionBranch: Story = { args: { config: configs[3] } }
export const ActionTable: Story = { args: { config: configs[4] } }
