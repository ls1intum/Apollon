import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DiagramView } from "@/types"
import { MODE_OPTIONS, ShareLinkRow } from "./ShareLinkRow"

/**
 * Drives the controlled `mode` locally so a picked dropdown option reflects back
 * into the row (the interaction story below asserts the reported value).
 */
function ControlledShareLinkRow(props: ComponentProps<typeof ShareLinkRow>) {
  const [mode, setMode] = useState(props.mode)
  return (
    <ShareLinkRow
      {...props}
      mode={mode}
      onSelectMode={(next) => {
        setMode(next)
        props.onSelectMode(next)
      }}
    />
  )
}

/**
 * The share-link control reused by both share dialogs: a read-only link field, a
 * copy button with a transient "copied" check, and a custom dropdown that switches
 * the access mode (Collaborate / Edit / Add feedback / View feedback). It is fully
 * controlled — `copied` and `mode` are props — so every state is one `args` combo.
 */

const SAMPLE_LINK = "https://apollon.ase.in.tum.de/shared/8f2c-demo"

const meta = {
  title: "Webapp/Modals/ShareLinkRow",
  component: ShareLinkRow,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-96 rounded-md bg-[var(--home-surface-raised)] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    link: SAMPLE_LINK,
    copied: false,
    mode: DiagramView.COLLABORATE,
    options: MODE_OPTIONS,
    onCopy: fn(),
    onSelectMode: fn(),
  },
  argTypes: {
    link: { control: "text", table: { category: "Data" } },
    options: { control: false, table: { category: "Data" } },
    copied: {
      control: "boolean",
      description: "Transient copied state — flips the icon + button styling.",
      table: { category: "State" },
    },
    mode: {
      control: "select",
      options: Object.values(DiagramView),
      description: "The selected access mode the link carries.",
      table: { category: "State" },
    },
    onCopy: {
      action: "copy",
      description: "Called when the copy button is clicked.",
      table: { category: "Events" },
    },
    onSelectMode: {
      action: "selectMode",
      description: "Called with the chosen mode from the dropdown.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof ShareLinkRow>

export default meta
type Story = StoryObj<typeof meta>

/** The default control: a Collaborate link ready to copy. */
export const Default: Story = {}

/** Immediately after a copy — the check icon and accent styling. */
export const Copied: Story = {
  args: { copied: true },
}

/** The Edit access mode selected. */
export const EditMode: Story = {
  args: { mode: DiagramView.EDIT },
}

/** Clicking the copy button reports the copy intent. */
export const CopyClick: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /copy link/i }))
    await expect(args.onCopy).toHaveBeenCalled()
  },
}

/** Opening the mode dropdown and picking Edit reports the new mode. */
export const SwitchMode: Story = {
  // Drive the controlled `mode` so the picked option reflects back into the row.
  render: (args) => <ControlledShareLinkRow {...args} />,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /collaborate/i }))
    await userEvent.click(await canvas.findByRole("option", { name: /edit/i }))
    await expect(args.onSelectMode).toHaveBeenCalledWith(DiagramView.EDIT)
  },
}
