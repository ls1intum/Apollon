import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLDiagramType } from "@tumaet/apollon"
import { WebappProviders } from "../../stories/_support/webapp"
import { navbarButtonStyle } from "@/components/navbar/styleConstants"
import { RefineBody, RefinePopover } from "./RefinePopover"
import { useHomeChrome } from "./useHomeChrome"

/**
 * The Linear-style grouped refinement panel: Source → Type → Sort. The `popover`
 * variant anchors to a Refine button (desktop); the `sheet` variant opens a
 * bottom-sheet (mobile). `RefineBody` is the shared, shell-agnostic body.
 */

const MOCK_TYPES: UMLDiagramType[] = [
  "ClassDiagram",
  "ObjectDiagram",
  "ActivityDiagram",
]

function PopoverHarness({ variant }: { variant: "popover" | "sheet" }) {
  const chrome = useHomeChrome()
  return (
    <RefinePopover
      variant={variant}
      chrome={chrome}
      typeOptions={MOCK_TYPES}
      trigger={
        <button type="button" className={navbarButtonStyle()}>
          Refine
        </button>
      }
    />
  )
}

function BodyHarness() {
  const chrome = useHomeChrome()
  return (
    <div className="apollon-glass w-80 rounded-[var(--apollon-chrome-radius-lg)] p-3.5">
      <RefineBody chrome={chrome} typeOptions={MOCK_TYPES} />
    </div>
  )
}

const meta = {
  title: "Webapp/Home/RefinePopover",
  parameters: { layout: "centered" },
  decorators: [
    WebappProviders,
    (Story) => (
      <div className="bg-[var(--apollon-chrome-surface)] p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The grouped body in isolation (no shell) — review the Source/Type/Sort blocks. */
export const Body: Story = {
  render: () => <BodyHarness />,
}

/** Picking a Source segment marks it selected (and deselects the prior one). */
export const SelectsSource: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: () => <BodyHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Scope to the Source block — "All" also appears in the Type block.
    const source = within(canvas.getByRole("group", { name: "Source" }))
    const all = source.getByRole("button", { name: "All" })
    const local = source.getByRole("button", { name: "Local" })
    await expect(all).toHaveAttribute("aria-pressed", "true")
    await expect(local).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(local)

    await expect(local).toHaveAttribute("aria-pressed", "true")
    await expect(all).toHaveAttribute("aria-pressed", "false")
  },
}

/** Desktop popover: clicking the trigger opens the anchored panel. */
export const PopoverVariant: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: () => <PopoverHarness variant="popover" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /refine/i }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText(/^Source$/)).toBeInTheDocument()
  },
}

/** Mobile sheet: the trigger opens a bottom-sheet variant of the same body. */
export const SheetVariant: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: () => <PopoverHarness variant="sheet" />,
  globals: { viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /refine/i }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText(/^Source$/)).toBeInTheDocument()
    await expect(
      await body.findByRole("button", { name: /^Done$/ })
    ).toBeInTheDocument()
  },
}

/** Dark theme — the grouped body on the opaque popover surface. */
export const Dark: Story = {
  tags: ["!autodocs"],
  render: () => <BodyHarness />,
  globals: { theme: "dark" },
}

/** Desktop popover in dark — verifies the standard `bg-popover` surface. */
export const PopoverVariantDark: Story = {
  tags: ["!autodocs"],
  render: () => <PopoverHarness variant="popover" />,
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /refine/i }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText(/^Source$/)).toBeInTheDocument()
  },
}

/** Mobile sheet in dark — verifies the opaque sheet edge + pinned Done footer. */
export const SheetVariantDark: Story = {
  tags: ["!autodocs"],
  render: () => <PopoverHarness variant="sheet" />,
  globals: { theme: "dark", viewport: { value: "mobile1" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /refine/i }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText(/^Source$/)).toBeInTheDocument()
    await expect(
      await body.findByRole("button", { name: /^Done$/ })
    ).toBeInTheDocument()
  },
}
