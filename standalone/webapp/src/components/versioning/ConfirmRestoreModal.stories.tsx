import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import {
  makeVersion,
  resetVersionStore,
  seedVersions,
} from "../../stories/_support/versioning"
import { ConfirmRestoreModal } from "./ConfirmRestoreModal"

/**
 * The local-mode confirm-when-dirty restore dialog (collab's 10s undo snackbar
 * has no equivalent locally). The opener passes the target `version` to name it
 * in the warning copy, falling back to "this version" when `version: null`, and
 * the modal awaits the page-provided async `onConfirm` while disabling both
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
    version: target,
    onConfirm: fn(),
  },
  argTypes: {
    version: { control: false, table: { category: "Data" } },
    onConfirm: {
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
  tags: ["test", "!autodocs", "!dev"],
  beforeEach: () => {
    resetVersionStore()
  },
  args: { version: null },
  play: async () => {
    const canvas = within(document.body)
    await expect(
      canvas.getByText(/restore 'this version'\? this replaces your current/i)
    ).toBeInTheDocument()
  },
}

/** The seeded version's description is woven into the confirm copy. */
export const ShowsVersionLabel: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async () => {
    const canvas = within(document.body)
    await expect(
      canvas.getByText(
        /restore 'initial domain sketch with the core entities\.'\?/i
      )
    ).toBeInTheDocument()
  },
}

/** Clicking Restore awaits `onConfirm` exactly once. */
export const ConfirmRestores: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args }) => {
    const canvas = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: /^restore$/i }))
    await expect(args.onConfirm).toHaveBeenCalledTimes(1)
  },
}

/** Cancel leaves the restore untriggered. */
export const CancelKeepsCanvas: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args }) => {
    const canvas = within(document.body)
    await userEvent.click(canvas.getByRole("button", { name: /cancel/i }))
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}
