import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import type { PendingVersion } from "@/stores/useVersionStore"
import { useVersionStore } from "@/stores/useVersionStore"
import { VersionPreviewBanner } from "./VersionPreviewBanner"

/**
 * The read-only-preview banner overlaid on the canvas while a past version is
 * being previewed. It reads the active preview + the matching version summary
 * from `useVersionStore`, shows the version's label and relative time, and
 * offers "Exit preview" plus an optional "Restore" action. It renders nothing
 * when no preview is active.
 */

const DIAGRAM_ID = "diagram-versions"

const previewedVersion: PendingVersion = {
  id: "v5",
  diagramId: DIAGRAM_ID,
  name: "Initial domain sketch",
  description: "Initial domain sketch with the core entities.",
  createdAt: "2026-06-12T14:15:00.000Z",
  kind: "user",
  librarySchemaVersion: "4.0.0",
  seq: 5,
}

const seedPreview = () => {
  useVersionStore.setState({
    versions: { [DIAGRAM_ID]: [previewedVersion] },
    preview: {
      versionId: previewedVersion.id,
      body: { version: "4.0.0", nodes: [], edges: [] } as never,
    },
  })
}

const meta = {
  title: "Webapp/Versioning/VersionPreviewBanner",
  component: VersionPreviewBanner,
  parameters: { layout: "centered" },
  args: {
    diagramId: DIAGRAM_ID,
    onExit: fn(),
    onRestore: fn(),
    canRestore: true,
    containerWidth: 900,
  },
  beforeEach: () => {
    useVersionStore.setState({ versions: {}, preview: null })
  },
} satisfies Meta<typeof VersionPreviewBanner>

export default meta
type Story = StoryObj<typeof meta>

/** Wide layout with both actions visible. */
export const Default: Story = {
  beforeEach: seedPreview,
}

/** Restore hidden (canRestore=false) — only "Exit preview" remains. */
export const ExitOnly: Story = {
  args: { canRestore: false },
  beforeEach: seedPreview,
}

/** Narrow container: the buttons stack and the copy tightens. */
export const Narrow: Story = {
  args: { containerWidth: 420 },
  beforeEach: seedPreview,
}

/** Dark-pinned to review the warning palette. */
export const Dark: Story = {
  beforeEach: seedPreview,
  globals: { theme: "dark" },
}

/** Clicking "Exit preview" invokes `onExit`. */
export const ExitInteraction: Story = {
  beforeEach: seedPreview,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /exit preview/i }))
    await expect(args.onExit).toHaveBeenCalled()
  },
}
