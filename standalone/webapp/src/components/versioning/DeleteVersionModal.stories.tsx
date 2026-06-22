import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { useVersionStore } from "@/stores/useVersionStore"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import {
  SAMPLE_DIAGRAM_ID,
  makeVersion,
  resetVersionStore,
  seedVersions,
} from "../../stories/_support/versioning"
import { DeleteVersionModal } from "./DeleteVersionModal"

/**
 * Body of the delete-version confirmation modal. It reads the target version
 * from `useVersionStore` to name it in the warning copy, and only deletes on
 * confirm. With no matching version seeded it falls back to generic copy.
 */

const VERSION_ID = "version-5"

const target = makeVersion({
  id: VERSION_ID,
  seq: 5,
  name: "Initial domain sketch",
  description: "Initial domain sketch with the core entities.",
})

const meta = {
  title: "Webapp/Versioning/DeleteVersionModal",
  component: DeleteVersionModal,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [ModalBodyProviders],
  args: { diagramId: SAMPLE_DIAGRAM_ID, versionId: VERSION_ID },
  argTypes: {
    diagramId: { control: false, table: { category: "Data" } },
    versionId: { control: false, table: { category: "Data" } },
  },
  beforeEach: () => {
    resetVersionStore()
    seedVersions([target])
  },
} satisfies Meta<typeof DeleteVersionModal>

export default meta
type Story = StoryObj<typeof meta>

/** Confirmation naming the targeted version from its description. */
export const Default: Story = {}

/** No matching version in the store — the generic fallback copy is shown. */
export const FallbackCopy: Story = {
  beforeEach: () => {
    resetVersionStore()
  },
  args: { versionId: "missing-version" },
}

/** The named version is surfaced in the warning text. */
export const ShowsVersionLabel: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/initial domain sketch/i)).toBeInTheDocument()
  },
}

/** Clicking Delete invokes the store's `deleteVersion` for the target. */
export const ConfirmDeletes: Story = {
  beforeEach: () => {
    resetVersionStore()
    seedVersions([target])
    // Swap in a spy so the play test can assert the delete fired without a backend.
    useVersionStore.setState({ deleteVersion: fn(async () => {}) })
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const deleteVersion = useVersionStore.getState().deleteVersion
    await userEvent.click(canvas.getByRole("button", { name: /^delete$/i }))
    await expect(deleteVersion).toHaveBeenCalledWith(
      SAMPLE_DIAGRAM_ID,
      VERSION_ID
    )
  },
}
