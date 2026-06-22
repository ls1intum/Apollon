import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type MouseEvent } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { DropdownMenuItem } from "@tumaet/ui/components/dropdown-menu"
import { MenuShell } from "./MenuShell"

/**
 * The shared trigger-button + dropdown-menu chrome for the dashboard dropdowns.
 * Open state is caller-owned: a non-null `anchorEl` means open. The trigger
 * click flows through `onToggle`; outside-click / Escape flow through `onClose`.
 * The popup portals to `document.body`, so it is queried there in tests.
 */
const meta = {
  title: "Webapp/Home/MenuShell",
  component: MenuShell,
  // Render-only demo stories wire the trigger/anchor inside `render`; these
  // satisfy the required-prop types of `satisfies Meta` (mirrors ui/select).
  args: {
    buttonId: "menu-button",
    menuId: "menu",
    anchorEl: null,
    onToggle: fn(),
    onClose: fn(),
    triggerContent: null,
    triggerClassName: "",
    children: null,
  },
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof MenuShell>

export default meta
type Story = StoryObj<typeof meta>

/** Stateful harness that owns `anchorEl` the way the gallery does. */
const MenuShellHarness = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const onToggle = (event: MouseEvent<HTMLButtonElement>) =>
    setAnchorEl((prev) => (prev ? null : event.currentTarget))

  return (
    <MenuShell
      buttonId="menu-shell-trigger"
      menuId="menu-shell-popup"
      anchorEl={anchorEl}
      onToggle={onToggle}
      onClose={() => setAnchorEl(null)}
      triggerAriaLabel="Open menu"
      triggerClassName="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
      triggerContent={<>Sort by</>}
    >
      <DropdownMenuItem className="rounded-md px-2 py-1.5 text-xs">
        Last edited
      </DropdownMenuItem>
      <DropdownMenuItem className="rounded-md px-2 py-1.5 text-xs">
        Name
      </DropdownMenuItem>
      <DropdownMenuItem className="rounded-md px-2 py-1.5 text-xs">
        Date created
      </DropdownMenuItem>
    </MenuShell>
  )
}

/** Closed by default; click the trigger to open the portalled popup. */
export const Default: Story = {
  render: () => <MenuShellHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await canvas.findByRole("button", { name: /open menu/i })

    await userEvent.click(trigger)
    const menu = await body.findByRole("menu")
    await expect(menu).toBeInTheDocument()
    await expect(body.getByText("Last edited")).toBeVisible()
  },
}
