import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type MouseEvent } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { DropdownFilterMenu } from "./DropdownFilterMenu"

/**
 * A sectioned filter dropdown built on `MenuShell`. Each section is a titled run
 * of single-select items; the selected item shows a trailing `selectedLabel`.
 * Open state is caller-owned via `anchorEl`. The popup portals to
 * `document.body`, so it is queried there in the play test.
 */
const meta = {
  title: "Webapp/Home/DropdownFilterMenu",
  component: DropdownFilterMenu,
  // Render-only demo stories wire the trigger/anchor inside `render`; these
  // satisfy the required-prop types of `satisfies Meta` (mirrors ui/select).
  args: {
    buttonId: "filter-button",
    menuId: "filter-menu",
    anchorEl: null,
    onToggle: fn(),
    onClose: fn(),
    triggerClassName: "",
    triggerContent: null,
    sections: [],
  },
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof DropdownFilterMenu>

export default meta
type Story = StoryObj<typeof meta>

const triggerClassName =
  "inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"

/** Stateful harness owning the open state and the current selection. */
const FilterHarness = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [type, setType] = useState("all")
  const [sort, setSort] = useState("edited")

  const onToggle = (event: MouseEvent<HTMLButtonElement>) =>
    setAnchorEl((prev) => (prev ? null : event.currentTarget))

  return (
    <DropdownFilterMenu
      buttonId="filter-trigger"
      menuId="filter-popup"
      anchorEl={anchorEl}
      onToggle={onToggle}
      onClose={() => setAnchorEl(null)}
      triggerClassName={triggerClassName}
      triggerContent={<span>Filter</span>}
      sections={[
        {
          title: "Diagram type",
          items: [
            {
              key: "all",
              label: "All types",
              selected: type === "all",
              onSelect: () => setType("all"),
            },
            {
              key: "class",
              label: "Class diagram",
              selected: type === "class",
              onSelect: () => setType("class"),
            },
            {
              key: "activity",
              label: "Activity diagram",
              selected: type === "activity",
              onSelect: () => setType("activity"),
            },
          ],
        },
        {
          title: "Sort by",
          items: [
            {
              key: "edited",
              label: "Last edited",
              selected: sort === "edited",
              onSelect: () => setSort("edited"),
            },
            {
              key: "name",
              label: "Name",
              selected: sort === "name",
              onSelect: () => setSort("name"),
            },
          ],
        },
      ]}
    />
  )
}

/** Closed by default; the play test opens it and asserts via `document.body`. */
export const Default: Story = {
  render: () => <FilterHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await canvas.findByRole("button", { name: /filter/i })

    await userEvent.click(trigger)

    const menu = await body.findByRole("menu")
    await expect(menu).toBeInTheDocument()
    await expect(body.getByText("Diagram type")).toBeVisible()
    await expect(body.getByText("Sort by")).toBeVisible()
    await expect(body.getByText("Last edited")).toBeVisible()

    await userEvent.click(body.getByText("Class diagram"))
  },
}

/** Pinned dark to verify section headers and the selected highlight on dark. */
export const Dark: Story = {
  tags: ["!test"],
  globals: { theme: "dark" },
  render: () => <FilterHarness />,
}
