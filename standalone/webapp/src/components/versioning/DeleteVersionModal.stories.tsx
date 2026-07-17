import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import {
  SAMPLE_DIAGRAM_ID,
  makeVersion,
  resetVersionStore,
  seedVersions,
} from "../../stories/_support/versioning"
import { DeleteVersionModal } from "./DeleteVersionModal"

/**
 * Body of the delete-version confirmation modal. The opener passes the target
 * `version` to name it in the warning copy, and it only deletes on confirm.
 * With `version: null` it falls back to generic copy.
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
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "360px" } },
  },
  decorators: [withModalFrame({ title: "Delete version", variant: "confirm" })],
  args: {
    diagramId: SAMPLE_DIAGRAM_ID,
    versionId: VERSION_ID,
    version: target,
  },
  argTypes: {
    diagramId: { control: false, table: { category: "Data" } },
    versionId: { control: false, table: { category: "Data" } },
    version: { control: false, table: { category: "Data" } },
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

/**
 * No matching version in the store — the generic fallback copy is shown and the
 * named label never appears.
 */
export const FallbackCopy: Story = {
  tags: ["test", "!autodocs", "!dev"],
  beforeEach: () => {
    resetVersionStore()
  },
  args: { versionId: "missing-version", version: null },
  play: async () => {
    const canvas = within(document.body)
    await expect(
      canvas.getByText(/this version will be permanently removed/i)
    ).toBeInTheDocument()
    expect(canvas.queryByText(/initial domain sketch/i)).not.toBeInTheDocument()
  },
}

/** The seeded version's description is woven into the destructive warning copy. */
export const ShowsVersionLabel: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async () => {
    const canvas = within(document.body)
    await expect(
      canvas.getByText(
        /'initial domain sketch with the core entities\.' will be permanently removed/i
      )
    ).toBeInTheDocument()
  },
}

// Repository-level spy: the modal's delete mutation goes through the bound
// `VersionRepository`, so stories assert at the same seam the app uses.
let deleteSpy = fn(async () => {})

/** Clicking Delete invokes the repository's `delete` for the target. */
export const ConfirmDeletes: Story = {
  tags: ["test", "!autodocs", "!dev"],
  beforeEach: () => {
    resetVersionStore()
    deleteSpy = fn(async () => {})
    seedVersions([target], { overrides: { delete: deleteSpy } })
  },
  play: async () => {
    const canvas = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: /^delete$/i }))
    await expect(deleteSpy).toHaveBeenCalledWith(SAMPLE_DIAGRAM_ID, VERSION_ID)
  },
}

/** Cancel dismisses the dialog without deleting the version. */
export const CancelKeepsVersion: Story = {
  tags: ["test", "!autodocs", "!dev"],
  beforeEach: () => {
    resetVersionStore()
    deleteSpy = fn(async () => {})
    seedVersions([target], { overrides: { delete: deleteSpy } })
  },
  play: async () => {
    const canvas = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: /cancel/i }))
    await expect(deleteSpy).not.toHaveBeenCalled()
  },
}
