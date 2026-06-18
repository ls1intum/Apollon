import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  EditorStoreDecorator,
  ElementPreview,
  elementConfigsFor,
} from "../_support/editor"

/**
 * The individual BPMN element renderers (the SVGs the Sidebar shows as drag
 * ghosts), each in isolation. Smoke-validates the store-decorator path that the
 * per-family element galleries build on.
 */
const meta = {
  title: "Editor/Elements/BPMN",
  component: ElementPreview,
  decorators: [EditorStoreDecorator],
  parameters: { layout: "centered" },
  // `!test`: the SVG renderers import editor source, which pulls a second React
  // copy under the Vitest browser runner. Visual-only — browse in Storybook.
  tags: ["autodocs", "!test"],
} satisfies Meta<typeof ElementPreview>

export default meta
type Story = StoryObj<typeof meta>

const configs = elementConfigsFor("BPMN")

/** All BPMN element shapes laid out together. */
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

export const Task: Story = { args: { config: configs[0] } }
export const Subprocess: Story = { args: { config: configs[1] } }
export const Group: Story = { args: { config: configs[4] } }
export const StartEvent: Story = { args: { config: configs[6] } }
export const EndEvent: Story = { args: { config: configs[8] } }
export const Gateway: Story = { args: { config: configs[9] } }
export const DataObject: Story = { args: { config: configs[10] } }
export const DataStore: Story = { args: { config: configs[11] } }
export const Pool: Story = { args: { config: configs[12] } }
