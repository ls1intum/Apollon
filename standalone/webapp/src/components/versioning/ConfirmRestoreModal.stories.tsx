import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import {
  SAMPLE_DIAGRAM_ID,
  makeVersion,
  resetVersionStore,
  seedVersions,
} from "../../stories/_support/versioning"
import { ConfirmRestoreModal } from "./ConfirmRestoreModal"

/**
 * The local-mode confirm-when-dirty restore dialog (collab's 10s undo snackbar
 * has no equivalent locally). It reads the target version from `useVersionStore`
 * to name it in the warning copy, falling back to "this version" when no match
 * is seeded, and awaits the page-provided async `onConfirm` while disabling both
 * buttons.
 */

const VERSION_ID = "version-5"

const target = makeVersion({
  id: VERSION_ID,
  seq: 5,
  name: "Initial domain sketch",
  description: "Initial domain sketch with the core entities.",
})

const meta = {
  title: "Webapp/Versioning/ConfirmRestoreModal",
  component: ConfirmRestoreModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "360px" } },
  },
  decorators: [
    withModalFrame({ title: "Restore this version?", variant: "confirm" }),
  ],
  args: {
    diagramId: SAMPLE_DIAGRAM_ID,
    versionId: VERSION_ID,
    onConfirm: fn(),
  },
  argTypes: {
    diagramId: { control: false, table: { category: "Data" } },
    versionId: { control: false, table: { category: "Data" } },
    onConfirm: {
      action: "confirm",
      description: "Async restore action awaited before the modal closes.",
      table: { category: "Events" },
    },
  },
  beforeEach: () => {
    resetVersionStore()
    seedVersions([target])
  },
} satisfies Meta<typeof ConfirmRestoreModal>

export default meta
type Story = StoryObj<typeof meta>

/** Confirmation naming the targeted version from its description. */
export const Default: Story = {}

/** No matching version in the store — the generic "this version" fallback. */
export const FallbackLabel: Story = {
  beforeEach: () => {
    resetVersionStore()
  },
  args: { versionId: "missing-version" },
}

/** The named version is surfaced in the warning copy. */
export const ShowsVersionLabel: Story = {
  play: async () => {
    const canvas = within(document.body)
    await expect(canvas.getByText(/initial domain sketch/i)).toBeInTheDocument()
  },
}

/** Clicking Restore awaits `onConfirm`, then closes the modal. */
export const ConfirmRestores: Story = {
  play: async ({ args }) => {
    const canvas = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: /^restore$/i }))
    await expect(args.onConfirm).toHaveBeenCalled()
  },
}

/** Cancel leaves the restore untriggered. */
export const CancelKeepsCanvas: Story = {
  play: async ({ args }) => {
    const canvas = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: /cancel/i }))
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}
