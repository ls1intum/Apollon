import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DarkNavbarSurface } from "@/stories/_support/webapp"
import { makeVersion } from "@/stories/_support/versioning"
import { CurrentVersionRowView } from "./CurrentVersionRow"

/**
 * The pure HEAD pseudo-row at the top of the version sidebar ("you are here").
 * It has three resting states — up to date (green check), edits since last save
 * (amber dot), and no snapshot yet (muted circle) — plus a "Return to current"
 * form while previewing an earlier version. Everything is driven by `args`; the
 * row reports the return-to-current click via `onExitPreview`.
 */
const latestSaved = makeVersion({
  id: "v-latest",
  seq: 3,
  name: "Milestone 1",
  description: "",
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
})

const meta = {
  title: "Webapp/Versioning/CurrentVersionRow",
  component: CurrentVersionRowView,
  parameters: { layout: "centered" },
  // The sidebar is a theme-following chrome surface; preview the row on the
  // matching themed chrome strip (DarkNavbarSurface, despite its legacy name).
  decorators: [
    DarkNavbarSurface,
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    hasChanges: false,
    latestSavedVersion: latestSaved,
    isPreviewing: false,
    onExitPreview: fn(),
  },
  argTypes: {
    hasChanges: {
      control: "boolean",
      description:
        "Whether the canvas has edits since the last snapshot (amber dot).",
      table: { category: "State" },
    },
    latestSavedVersion: {
      control: false,
      description: "The latest non-pending, non-failed version, if any.",
      table: { category: "Data" },
    },
    isPreviewing: {
      control: "boolean",
      description:
        'When true the row becomes a "Return to current" affordance.',
      table: { category: "State" },
    },
    onExitPreview: {
      action: "exitPreview",
      description: 'Called when the user clicks "Return to current".',
      table: { category: "Events" },
    },
    className: {
      control: "text",
      description: "Merged onto the root element's classes.",
      table: { category: "Appearance" },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CurrentVersionRowView>

export default meta
type Story = StoryObj<typeof meta>

/** Canvas matches the last snapshot — green check, "Up to date". */
export const UpToDate: Story = {}

/** Edits exist since the last snapshot — amber filled dot. */
export const EditsSinceSave: Story = {
  args: { hasChanges: true },
}

/** No snapshot has ever been taken — muted outline circle. */
export const NoSnapshot: Story = {
  args: { latestSavedVersion: undefined },
}

/** While previewing an earlier version the row becomes "Return to current". */
export const Previewing: Story = {
  args: { isPreviewing: true },
}

/** Clicking "Return to current" reports `onExitPreview`. */
export const ExitPreviewInteraction: Story = {
  args: { isPreviewing: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /return to current canvas/i })
    )
    await expect(args.onExitPreview).toHaveBeenCalled()
  },
}
