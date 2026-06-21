import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import type { PendingVersion } from "@/stores/useVersionStore"
import { useVersionStore } from "@/stores/useVersionStore"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { DeleteVersionModal } from "./DeleteVersionModal"

/**
 * Body of the delete-version confirmation modal. It reads the target version
 * from `useVersionStore` to name it in the warning copy, and only deletes on
 * confirm. With no matching version seeded it falls back to generic copy.
 */

const DIAGRAM_ID = "diagram-versions"
const VERSION_ID = "v5"

const targetVersion: PendingVersion = {
  id: VERSION_ID,
  diagramId: DIAGRAM_ID,
  name: "Initial domain sketch",
  description: "Initial domain sketch with the core entities.",
  createdAt: "2026-06-12T14:15:00.000Z",
  kind: "user",
  librarySchemaVersion: "4.0.0",
  seq: 5,
}

const meta = {
  title: "Webapp/Versioning/DeleteVersionModal",
  component: DeleteVersionModal,
  parameters: { layout: "centered" },
  decorators: [ModalBodyProviders],
  args: { diagramId: DIAGRAM_ID, versionId: VERSION_ID },
  beforeEach: () => {
    useVersionStore.setState({
      versions: { [DIAGRAM_ID]: [targetVersion] },
      preview: null,
    })
  },
} satisfies Meta<typeof DeleteVersionModal>

export default meta
type Story = StoryObj<typeof meta>

/** Confirmation naming the targeted version from its description. */
export const Default: Story = {}

/** Dark-pinned confirmation. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/** No matching version in the store — the generic fallback copy is shown. */
export const FallbackCopy: Story = {
  args: { versionId: "missing-version" },
}

/** The named version is surfaced in the warning text. */
export const ShowsVersionLabel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/initial domain sketch/i)).toBeInTheDocument()
  },
}
