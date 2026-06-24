import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "./button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog"

/**
 * A modal confirmation built on Base UI's `AlertDialog`. Unlike `Dialog` it has
 * no dismiss-by-backdrop and no close "X" — it forces an explicit choice
 * between `AlertDialogAction` (the deliberate, usually destructive action) and
 * `AlertDialogCancel`. It portals to `document.body`, traps focus, closes on
 * `Escape`, and restores focus to the trigger on close.
 */
const meta = {
  title: "UI/Components/AlertDialog",
  component: AlertDialog,
  tags: ["autodocs"],
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
  },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        Delete diagram
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this diagram?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the diagram from this device. This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
} satisfies Meta<typeof AlertDialog>

export default meta

type Story = StoryObj<typeof meta>

/**
 * The default destructive confirmation opened from a trigger button.
 */
export const Default: Story = {}

/**
 * The confirmation pinned open so the layout can be reviewed at a glance.
 */
export const Open: Story = {
  args: {
    defaultOpen: true,
  },
}

/**
 * The confirmation pinned open in dark mode to review surface, ring, and footer
 * contrast.
 */
export const Dark: Story = {
  args: {
    defaultOpen: true,
  },
  globals: {
    theme: "dark",
  },
}

/**
 * Verifies portalled behaviour: opening sets `data-open`, focus is trapped,
 * the Cancel button closes it without confirming, and the destructive action
 * fires its handler then closes — all asserted against `document.body` since
 * Base UI portals there.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: {
    onOpenChange: fn(),
  },
  render: (args) => {
    const onConfirm = fn()
    return (
      <AlertDialog {...args}>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          Delete diagram
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this diagram?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the diagram from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              data-testid="confirm"
              onClick={() => onConfirm()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  },
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)

    await step("opening sets data-open", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /delete diagram/i })
      )
      const dialog = await body.findByRole("alertdialog")
      await waitFor(() => expect(dialog).toHaveAttribute("data-open"))
    })

    await step("Cancel closes without confirming", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /cancel/i })
      )
      await waitFor(() =>
        expect(body.queryByRole("alertdialog")).not.toBeInTheDocument()
      )
    })

    await step("the destructive action confirms and closes", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /delete diagram/i })
      )
      await body.findByRole("alertdialog")
      await userEvent.click(await body.findByTestId("confirm"))
      await waitFor(() =>
        expect(body.queryByRole("alertdialog")).not.toBeInTheDocument()
      )
    })
  },
}
