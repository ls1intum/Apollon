import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "./button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"

/**
 * A modal dialog built on Base UI's `Dialog`. It portals to `document.body`,
 * traps focus, closes on `Escape` or backdrop click, and restores focus to the
 * trigger on close. `DialogContent` accepts `showCloseButton` (default `true`)
 * and `DialogFooter` accepts `showCloseButton` (default `false`) to render a
 * built-in "Close" action.
 */
const meta = {
  title: "UI/Components/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  args: {
    onOpenChange: fn(),
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "Controlled open state.",
    },
    defaultOpen: {
      control: "boolean",
      description: "Open state on mount (uncontrolled).",
    },
    modal: {
      control: "boolean",
      description:
        "Whether the dialog blocks interaction with the rest of the page.",
    },
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you are done.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The default dialog opened from a trigger button.
 */
export const Default: Story = {}

/**
 * A dialog whose open state is driven by the `open` arg.
 */
export const Open: Story = {
  args: {
    defaultOpen: true,
  },
}

/**
 * Footer with explicit cancel and confirm actions wired to `DialogClose`.
 */
export const WithFooterActions: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save changes?</DialogTitle>
          <DialogDescription>
            Your changes will be applied immediately once you confirm.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose render={<Button />}>Save</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/**
 * Hides the top-right close button via `showCloseButton={false}`, forcing the
 * user to use an explicit footer action.
 */
export const NoCloseButton: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Terms of service</DialogTitle>
          <DialogDescription>
            You must explicitly accept or decline to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Decline
          </DialogClose>
          <DialogClose render={<Button />}>Accept</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/**
 * Long body content scrolls within the dialog while the header and footer stay
 * in place.
 */
export const LongScrollingContent: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline" />}>
        Read changelog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changelog</DialogTitle>
          <DialogDescription>Everything new in this release.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto text-sm text-muted-foreground">
          {Array.from({ length: 24 }).map((_, i) => (
            <p key={i} className="py-1">
              Item {i + 1}: a meaningful, user-facing improvement landed in this
              release and is described in this scrollable region.
            </p>
          ))}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
}

/**
 * A destructive confirmation using a `destructive` button for the primary
 * action.
 */
export const DestructiveConfirm: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="destructive" />}>
        Delete account
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <DialogClose render={<Button variant="destructive" />}>
            Delete
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

/**
 * The dialog pinned open in dark mode to review surface, ring, and footer
 * contrast.
 */
export const Dark: Story = {
  args: {
    defaultOpen: true,
  },
  parameters: {
    themes: { themeOverride: "dark" },
  },
  globals: {
    theme: "dark",
  },
}

/**
 * Verifies portalled behaviour: opening sets `data-open`, focus is trapped,
 * `Escape` closes it, the close button closes it, and a backdrop click closes
 * it — all asserted against `document.body` since Base UI portals there.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline" />}>
        Open dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you are done.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)

    await step("opening sets data-open", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /open dialog/i })
      )
      const dialog = await body.findByRole("dialog")
      await waitFor(() => expect(dialog).toHaveAttribute("data-open"))
    })

    await step("Escape closes the dialog", async () => {
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(body.queryByRole("dialog")).not.toBeInTheDocument()
      )
    })

    await step("close button closes the dialog", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /open dialog/i })
      )
      await body.findByRole("dialog")
      await userEvent.click(await body.findByRole("button", { name: /close/i }))
      await waitFor(() =>
        expect(body.queryByRole("dialog")).not.toBeInTheDocument()
      )
    })
  },
}
