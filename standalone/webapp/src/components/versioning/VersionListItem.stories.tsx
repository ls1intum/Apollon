import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { PendingVersion } from "@/stores/useVersionStore"
import { useVersionStore } from "@/stores/useVersionStore"
import { NAVBAR_BACKGROUND_COLOR } from "@/constants"
import { VersionListItem } from "./VersionListItem"

/**
 * A single row in the version-history list. Renders a per-version thumbnail, the
 * description / autosave caption, the `#N · time-ago` line, and a kebab menu
 * (restore / copy link / edit description / delete).
 *
 * The thumbnail (`VersionThumbnail`) lazily mounts a live `ApollonEditor` to
 * render an SVG once the row scrolls into view and the body fetch resolves; in
 * Storybook that fetch has no backend, so it stays in the skeleton / icon
 * fallback. These rows are therefore *visual* — tagged `!test` to stay out of
 * the interaction-test run, which can't host the editor's second React copy.
 */

const DIAGRAM_ID = "diagram-versions"

const namedVersion: PendingVersion = {
  id: "version-named",
  diagramId: DIAGRAM_ID,
  name: "Add payment flow",
  description: "Add payment flow and reconcile the account aggregate.",
  createdAt: "2026-06-15T10:00:00.000Z",
  kind: "user",
  librarySchemaVersion: "4.0.0",
  seq: 7,
}

const autoVersion: PendingVersion = {
  id: "version-auto",
  diagramId: DIAGRAM_ID,
  name: "",
  description: "",
  createdAt: "2026-06-14T09:00:00.000Z",
  kind: "auto",
  librarySchemaVersion: "4.0.0",
  seq: 6,
}

const pendingVersion: PendingVersion = {
  id: "version-pending",
  diagramId: DIAGRAM_ID,
  name: "",
  description: "Saving milestone…",
  createdAt: "2026-06-16T08:00:00.000Z",
  kind: "user",
  librarySchemaVersion: "4.0.0",
  pending: true,
}

const meta = {
  title: "Webapp/Versioning/VersionListItem",
  component: VersionListItem,
  // The row mounts VersionThumbnail (a live editor renderer); keep it visual.
  tags: ["autodocs", "!test"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      // The list paints onto the dark navbar surface, so wrap in a matching
      // panel to show the row's real (light-on-dark) styling.
      <ul
        className="m-0 w-80 list-none rounded-md p-0"
        style={{ background: NAVBAR_BACKGROUND_COLOR }}
      >
        <Story />
      </ul>
    ),
  ],
  args: {
    diagramId: DIAGRAM_ID,
    version: namedVersion,
    versionNumber: 7,
    isPreviewing: false,
    canRestore: true,
    onPreview: fn(),
    onRestore: fn(),
    onDelete: fn(),
  },
  beforeEach: () => {
    // Seed the version into the store so the inline-edit and delete actions
    // can read the row's metadata without a fetch.
    useVersionStore.setState({
      versions: {
        [DIAGRAM_ID]: [namedVersion, autoVersion, pendingVersion],
      },
    })
  },
} satisfies Meta<typeof VersionListItem>

export default meta
type Story = StoryObj<typeof meta>

/** A user-named version with a description and a full kebab (incl. delete). */
export const Named: Story = {}

/** A raw auto-save: italic "Auto-saved" caption, no delete in the kebab. */
export const Autosave: Story = {
  args: { version: autoVersion, versionNumber: 6 },
}

/** The currently-previewed row, highlighted via the selected background. */
export const Previewing: Story = {
  args: { isPreviewing: true },
}

/** An optimistic pending row: reduced opacity, "Saving" caption, disabled menu. */
export const Pending: Story = {
  args: { version: pendingVersion, versionNumber: undefined },
}

/** Dark-pinned to confirm the row reads correctly under the dark token set. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
