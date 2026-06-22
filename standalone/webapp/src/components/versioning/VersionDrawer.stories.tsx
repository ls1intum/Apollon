import type { Meta, StoryObj } from "@storybook/react-vite"
import { useVersionStore } from "@/stores/useVersionStore"
import { WebappProviders } from "../../stories/_support/webapp"
import {
  SAMPLE_DIAGRAM_ID,
  SAMPLE_VERSIONS,
  openDrawer,
  resetVersionStore,
  seedVersions,
} from "../../stories/_support/versioning"
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
  args: { diagramId: SAMPLE_DIAGRAM_ID },
  beforeEach: () => {
    resetVersionStore()
  },
} satisfies Meta<typeof VersionSidebarBody>

export default meta
type Story = StoryObj<typeof meta>

/** A populated history: named milestones, an autosave, the composer, and meta. */
export const Populated: Story = {
  beforeEach: () => {
    seedVersions(SAMPLE_VERSIONS, { total: 7 })
    openDrawer()
  },
}

/** No versions yet — the empty body copy under the composer. */
export const Empty: Story = {
  beforeEach: () => {
    seedVersions([])
    openDrawer()
  },
}

/** A preview is active — the composer is hidden in favor of the read-only state. */
export const Previewing: Story = {
  beforeEach: () => {
    seedVersions(SAMPLE_VERSIONS, { total: 7 })
    useVersionStore.setState({
      preview: {
        diagramId: SAMPLE_DIAGRAM_ID,
        versionId: "v5",
        body: { version: "4.0.0", nodes: [], edges: [] } as never,
      },
    })
    openDrawer()
  },
}
