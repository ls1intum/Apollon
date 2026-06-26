import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { VersionPreviewBannerView } from "./VersionPreviewBanner"

/**
 * The pure read-only-preview banner overlaid on the canvas while a past version
 * is being previewed. It shows the version's label and relative time and offers
 * "Exit preview" plus an optional "Restore" action. Everything is driven by
 * `args` — the label/time-ago are resolved by the container, the view just
 * renders them and reports clicks via `onExit` / `onRestore`.
 */

const meta = {
  title: "Webapp/Versioning/VersionPreviewBanner",
  component: VersionPreviewBannerView,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    label: "Initial domain sketch with the core entities.",
    ago: "4d ago",
    versionId: "v5",
    onExit: fn(),
    onRestore: fn(),
    canRestore: true,
    containerWidth: 900,
  },
  argTypes: {
    label: {
      control: "text",
      description:
        "The version's user-facing label; empty hides the label row.",
      table: { category: "Data" },
    },
    ago: {
      control: "text",
      description: 'Relative "time ago" of the previewed version.',
      table: { category: "Data" },
    },
    versionId: {
      control: "text",
      description: "Id of the previewed version, handed back to onRestore.",
      table: { category: "Data" },
    },
    canRestore: {
      control: "boolean",
      description: "Hides the Restore button when restoring would be a no-op.",
      table: { category: "State" },
    },
    containerWidth: {
      control: { type: "range", min: 280, max: 1200, step: 10 },
      description:
        "Measured container width (px); drives the compact / stacked layout.",
      table: { category: "State" },
    },
    onExit: {
      description: 'Called when the user clicks "Exit preview".',
      table: { category: "Events" },
    },
    onRestore: {
      description: 'Called with the version id when "Restore" is clicked.',
      table: { category: "Events" },
    },
    className: {
      control: "text",
      description: "Merged onto the root element's classes.",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof VersionPreviewBannerView>

export default meta
type Story = StoryObj<typeof meta>

/** Wide layout with both actions visible. */
export const Default: Story = {}

/** Restore hidden (canRestore=false) — only "Exit preview" remains. */
export const ExitOnly: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { canRestore: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /exit preview/i })
    ).toBeInTheDocument()
    expect(
      canvas.queryByRole("button", { name: /restore/i })
    ).not.toBeInTheDocument()
  },
}

/** Narrow container: the buttons stack and the copy tightens. */
export const Narrow: Story = {
  args: { containerWidth: 420 },
}

/** No label resolved — only the title and time-ago line show. */
export const NoLabel: Story = {
  args: { label: "" },
}

/** Clicking "Exit preview" invokes `onExit`. */
export const ExitInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /exit preview/i }))
    await expect(args.onExit).toHaveBeenCalledTimes(1)
  },
}

/** Clicking "Restore" invokes `onRestore` with the version id. */
export const RestoreInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /restore/i }))
    await expect(args.onRestore).toHaveBeenCalledWith("v5")
  },
}
