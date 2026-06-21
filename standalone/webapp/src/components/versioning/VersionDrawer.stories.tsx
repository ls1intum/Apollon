import type { Meta, StoryObj } from "@storybook/react-vite"
import type { PendingVersion } from "@/stores/useVersionStore"
import { useVersionStore } from "@/stores/useVersionStore"
import { WebappProviders } from "../../stories/_support/webapp"
import { VersionSidebarBody } from "./VersionDrawer"

/**
 * The desktop version-history sidebar (`VersionSidebarBody`) — the inline panel that
 * reflows next to the canvas. It renders the chrome-free `VersionSidebarBody`:
 * the description composer, the `count / max` meta line with the autosave-filter
 * toggle, the current-version row, and the list of `VersionListItem` rows.
 *
 * Rows mount `VersionThumbnail`, which lazily spins up a live `ApollonEditor`,
 * and the body fires `fetchVersions` on mount (no backend in Storybook). With
 * versions pre-seeded into the store the list still renders; the failed fetch
 * only flips a loading/error flag. These are *visual* stories — tagged `!test`
 * so the editor's second React copy never loads under the interaction runner.
 */

const DIAGRAM_ID = "diagram-versions"

const versions: PendingVersion[] = [
  {
    id: "v7",
    diagramId: DIAGRAM_ID,
    name: "Add payment flow",
    description: "Add payment flow and reconcile the account aggregate.",
    createdAt: "2026-06-16T10:00:00.000Z",
    kind: "user",
    librarySchemaVersion: "4.0.0",
    seq: 7,
  },
  {
    id: "v6",
    diagramId: DIAGRAM_ID,
    name: "",
    description: "",
    createdAt: "2026-06-15T09:30:00.000Z",
    kind: "auto",
    librarySchemaVersion: "4.0.0",
    seq: 6,
  },
  {
    id: "v5",
    diagramId: DIAGRAM_ID,
    name: "Initial domain sketch",
    description: "Initial domain sketch with the core entities.",
    createdAt: "2026-06-12T14:15:00.000Z",
    kind: "user",
    librarySchemaVersion: "4.0.0",
    seq: 5,
  },
]

const openDrawer = (diagramId: string) => {
  useVersionStore.setState({
    drawerOpenByDiagram: { [diagramId]: true },
  })
}

const meta = {
  title: "Webapp/Versioning/VersionDrawer",
  component: VersionSidebarBody,
  // Mounts VersionThumbnail (a live editor renderer); keep these visual.
  tags: ["autodocs", "!test"],
  parameters: { layout: "fullscreen" },
  decorators: [
    WebappProviders,
    (Story) => (
      <div
        style={{ height: "100vh", display: "flex", justifyContent: "flex-end" }}
      >
        <Story />
      </div>
    ),
  ],
  args: { diagramId: DIAGRAM_ID },
  beforeEach: () => {
    useVersionStore.setState({
      versions: {},
      totals: {},
      nextCursor: {},
      loading: {},
      error: {},
      preview: null,
      drawerOpenByDiagram: {},
    })
  },
} satisfies Meta<typeof VersionSidebarBody>

export default meta
type Story = StoryObj<typeof meta>

/** A populated history: named milestones, an autosave, the composer, and meta. */
export const Populated: Story = {
  beforeEach: () => {
    useVersionStore.setState({
      versions: { [DIAGRAM_ID]: versions },
      totals: { [DIAGRAM_ID]: 7 },
    })
    openDrawer(DIAGRAM_ID)
  },
}

/** No versions yet — the empty body copy under the composer. */
export const Empty: Story = {
  beforeEach: () => {
    useVersionStore.setState({ versions: { [DIAGRAM_ID]: [] } })
    openDrawer(DIAGRAM_ID)
  },
}

/** A preview is active — the composer is hidden in favor of the read-only state. */
export const Previewing: Story = {
  beforeEach: () => {
    useVersionStore.setState({
      versions: { [DIAGRAM_ID]: versions },
      totals: { [DIAGRAM_ID]: 7 },
      preview: {
        diagramId: DIAGRAM_ID,
        versionId: "v5",
        body: { version: "4.0.0", nodes: [], edges: [] } as never,
      },
    })
    openDrawer(DIAGRAM_ID)
  },
}

/** Populated panel pinned to dark mode. */
export const Dark: Story = {
  beforeEach: () => {
    useVersionStore.setState({
      versions: { [DIAGRAM_ID]: versions },
      totals: { [DIAGRAM_ID]: 7 },
    })
    openDrawer(DIAGRAM_ID)
  },
  globals: { theme: "dark" },
}
