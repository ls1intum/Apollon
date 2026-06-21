import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, waitFor, within } from "storybook/test"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { useVersionStore } from "@/stores/useVersionStore"
import { EditorProvider } from "@/contexts/EditorContext"
import { ModalProvider } from "@/contexts/ModalContext"
import { SAMPLE_DIAGRAM_ID } from "../../stories/_support/versioning"
import { UndoRestoreSnackbar } from "./UndoRestoreSnackbar"

/**
 * The headless driver for the post-restore Undo affordance. It renders `null`
 * itself and instead watches `useVersionStore.undoRestore`, surfacing it as a
 * react-toastify toast (with an inline Undo button) that auto-dismisses when the
 * store's window expires. These stories mount a `ToastContainer` alongside it and
 * seed the store window so the toast actually appears.
 *
 * It reads `EditorContext` for the Undo action (guarded — no editor means Undo is
 * a no-op), so `WebappProviders` wraps it.
 */

/** Open the undo window in the store with a long expiry so it stays visible. */
function seedUndoWindow(restoredVersionName = "Initial domain sketch") {
  useVersionStore.setState({
    undoRestore: {
      diagramId: SAMPLE_DIAGRAM_ID,
      autoSnapshotVersionId: "auto-snapshot-1",
      restoredFromVersionId: "version-5",
      restoredVersionName,
      expiresAt: Date.now() + 60_000,
    },
  })
}

const meta = {
  title: "Webapp/Versioning/UndoRestoreSnackbar",
  component: UndoRestoreSnackbar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [
    // Mount the driver AND the ToastContainer inside the same EditorProvider so
    // the toast body (which reads EditorContext for its Undo action) renders
    // under the provider — react-toastify 11 renders toast content in place at
    // the container, so the container must itself sit inside the context.
    (Story) => (
      <EditorProvider>
        <ModalProvider>
          <div style={{ minHeight: 200 }}>
            <Story />
            <ToastContainer position="bottom-center" />
          </div>
        </ModalProvider>
      </EditorProvider>
    ),
  ],
  beforeEach: () => {
    useVersionStore.setState({ undoRestore: null })
  },
} satisfies Meta<typeof UndoRestoreSnackbar>

export default meta
type Story = StoryObj<typeof meta>

/** The undo toast surfaced for a just-restored named version. */
export const Default: Story = {
  beforeEach: () => seedUndoWindow(),
}

/** No active window — the driver renders nothing and no toast appears. */
export const NoWindow: Story = {}

/** Pinned dark for visual review of the toast on the dark token set. */
export const Dark: Story = {
  globals: { theme: "dark" },
  beforeEach: () => seedUndoWindow(),
}

/** The toast carries the restored name and an Undo control. */
export const ShowsUndoToast: Story = {
  beforeEach: () => seedUndoWindow("Add payment flow"),
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body)
    await waitFor(() =>
      expect(body.getByText(/restored 'add payment flow'/i)).toBeInTheDocument()
    )
    await expect(
      body.getByRole("button", { name: /undo restore/i })
    ).toBeInTheDocument()
  },
}
