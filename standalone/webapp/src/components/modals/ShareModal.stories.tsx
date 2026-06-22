import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import { ShareModal } from "./ShareModal"

/**
 * Body of the editor "Share" modal. Before sharing it shows a name field and a
 * "Create share link" action (uploading a copy only on click); once shared it
 * swaps to the link row whose dropdown carries the access mode. These stories
 * render the pre-share state, so nothing is uploaded. The access-mode dropdown
 * itself is covered in `ShareLinkRow.stories`.
 */
const meta = {
  title: "Webapp/Modals/ShareModal",
  component: ShareModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "560px" } },
  },
  decorators: [withModalFrame({ title: "Share", variant: "editor-share" })],
} satisfies Meta<typeof ShareModal>

export default meta
type Story = StoryObj<typeof meta>

/** The mode chooser with the four share actions and the recent-link field. */
export const Default: Story = {}

/** The pre-share state offers a name field and the create-link action. */
export const CreateState: Story = {
  play: async () => {
    const canvas = within(document.body)
    await expect(canvas.getByLabelText(/name/i)).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /create share link/i })
    ).toBeInTheDocument()
  },
}

/**
 * Already shared: opening on a `/shared/:id` route resolves a server id, so the
 * modal skips the create form and opens straight on the copyable link row with
 * the access-mode dropdown and the "Open diagram" action.
 */
export const AlreadyShared: Story = {
  parameters: {
    tanstackRouter: {
      initialEntry: "/shared/shared-abc123",
      routePaths: ["/shared/$id"],
    },
  },
  play: async () => {
    const canvas = within(document.body)
    // The create-only notice + name field are gone; the link row stands in.
    await expect(canvas.getByText(/anyone with this link/i)).toBeInTheDocument()
    await expect(canvas.queryByLabelText(/^name$/i)).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /open diagram/i })
    ).toBeInTheDocument()
  },
}
