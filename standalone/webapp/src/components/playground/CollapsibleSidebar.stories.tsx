import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { CollapsibleSidebar } from "./CollapsibleSidebar"

/**
 * A side rail that collapses to a thin strip with a chevron toggle. `side`
 * controls which edge it docks to (and the chevron direction); `open` is
 * controlled by the caller via `onToggle`. The toggle exposes
 * `aria-expanded`/`aria-controls`, and the content region is only mounted while
 * open. The contrast `surface` keeps the toggle visible on either background.
 */
const meta = {
  title: "Webapp/Misc/CollapsibleSidebar",
  component: CollapsibleSidebar,
  // Render-only demo stories own state inside `render`; these satisfy the
  // required-prop types of `satisfies Meta` (mirrors ui/select).
  args: {
    side: "left",
    width: 280,
    open: true,
    onToggle: fn(),
    label: "Sidebar",
    testId: "sidebar",
    children: null,
  },
  parameters: { layout: "fullscreen" },
  argTypes: {
    side: {
      control: "select",
      options: ["left", "right"],
      table: { category: "Layout" },
    },
    surface: {
      control: "select",
      options: ["base", "variant"],
      table: { category: "Appearance" },
    },
  },
  decorators: [
    (Story) => (
      <div className="flex h-[360px] bg-[var(--apollon-background-variant)]">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
} satisfies Meta<typeof CollapsibleSidebar>

export default meta
type Story = StoryObj<typeof meta>

/** Stateful harness owning the open/closed state. */
const SidebarHarness = ({
  side = "left",
  surface = "base",
  startOpen = true,
}: {
  side?: "left" | "right"
  surface?: "base" | "variant"
  startOpen?: boolean
}) => {
  const [open, setOpen] = useState(startOpen)
  return (
    <CollapsibleSidebar
      side={side}
      surface={surface}
      width={260}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      label="elements panel"
      testId="elements-sidebar"
    >
      <p className="text-sm">Panel contents go here.</p>
      <p className="text-sm">Drag elements onto the canvas.</p>
    </CollapsibleSidebar>
  )
}

/** Left-docked, open by default. Play test collapses then re-expands it. */
export const Left: Story = {
  render: () => <SidebarHarness side="left" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = await canvas.findByRole("button", {
      name: /collapse elements panel/i,
    })
    await expect(toggle).toHaveAttribute("aria-expanded", "true")

    await userEvent.click(toggle)
    const expand = await canvas.findByRole("button", {
      name: /expand elements panel/i,
    })
    await expect(expand).toHaveAttribute("aria-expanded", "false")

    await userEvent.click(expand)
    await expect(
      await canvas.findByRole("button", { name: /collapse elements panel/i })
    ).toBeInTheDocument()
  },
}

/** Right-docked rail. */
export const Right: Story = {
  render: () => (
    <div className="ml-auto flex">
      <SidebarHarness side="right" />
    </div>
  ),
}

/** Starts collapsed to the thin strip. */
export const Collapsed: Story = {
  render: () => <SidebarHarness side="left" startOpen={false} />,
}

/** The `variant` surface for the contrasting background. */
export const VariantSurface: Story = {
  render: () => <SidebarHarness side="left" surface="variant" />,
  decorators: [
    (Story) => (
      <div className="flex h-[360px] bg-[var(--apollon-background)]">
        <Story />
      </div>
    ),
  ],
}
