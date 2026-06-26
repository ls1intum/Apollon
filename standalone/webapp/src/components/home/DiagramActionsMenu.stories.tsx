import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DiagramView } from "@/types"
import {
  SAMPLE_LOCAL_DIAGRAM,
  SAMPLE_SHARED_DIAGRAM,
} from "../../stories/_support/persistence"
import { DiagramActionsMenuView } from "./DiagramCard"

/**
 * The pure three-dot actions menu on a diagram card. It owns only its open /
 * delete-confirm UI state; every action is an `onX` callback. The offered items
 * depend on the diagram: a local diagram exposes open/duplicate/delete, a shared
 * diagram adds copy-link / change-sharing-mode / remove-entry, and an expired
 * shared link collapses to just "remove from shared list". No store, navigation,
 * clipboard, or modal wiring — stories drive it via `args` and assert callbacks.
 */
const meta = {
  title: "Webapp/Home/DiagramActionsMenu",
  component: DiagramActionsMenuView,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    diagram: SAMPLE_LOCAL_DIAGRAM,
    canDelete: true,
    onOpen: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
    onShare: fn(),
    onCopySharedLink: fn(),
    onSaveLocalCopy: fn(),
    onChangeSharedView: fn(),
    onRemoveSharedEntry: fn(),
  },
  argTypes: {
    diagram: {
      control: "object",
      description: "The diagram the menu acts on (drives labels + the fork).",
      table: { category: "Data" },
    },
    isExpired: {
      control: "boolean",
      description: 'Collapse to only "remove from shared list".',
      table: { category: "State" },
    },
    canDelete: {
      control: "boolean",
      description:
        "Disable the Delete entry when the diagram is open elsewhere.",
      table: { category: "State" },
    },
    onOpen: {
      description: "Open the diagram in the editor.",
      table: { category: "Events" },
    },
    onDuplicate: {
      description: "Duplicate the (local) diagram.",
      table: { category: "Events" },
    },
    onDelete: {
      description: "Delete the (local) diagram after the destructive confirm.",
      table: { category: "Events" },
    },
    onShare: {
      description: "Open the share dashboard for the (local) diagram.",
      table: { category: "Events" },
    },
    onCopySharedLink: {
      description: "Copy the shared link for the current sharing mode.",
      table: { category: "Events" },
    },
    onSaveLocalCopy: {
      description: "Save the shared diagram as a new local copy.",
      table: { category: "Events" },
    },
    onChangeSharedView: {
      description: "Change the default sharing mode for a shared diagram.",
      table: { category: "Events" },
    },
    onRemoveSharedEntry: {
      description: "Remove a shared diagram from the local shared list.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof DiagramActionsMenuView>

export default meta
type Story = StoryObj<typeof meta>

/**
 * The opened Base UI dropdown injects its own focus-guard sentinels
 * (`aria-hidden` spans with `tabindex="0"`) to trap Tab focus. They are a
 * framework focus-management artifact, not our markup, and only exist while an
 * interaction story drives the menu open — so the rule is scoped off here.
 */
const openMenuA11y = {
  a11y: { options: { rules: { "aria-hidden-focus": { enabled: false } } } },
}

/** A local diagram: open, duplicate, share, delete. */
export const LocalDiagram: Story = {}

/** A shared diagram: copy link, save local copy, change sharing mode, remove. */
export const SharedDiagram: Story = {
  args: { diagram: SAMPLE_SHARED_DIAGRAM },
}

/** An expired shared link: only "remove from shared list" is offered. */
export const ExpiredLink: Story = {
  args: {
    diagram: { ...SAMPLE_SHARED_DIAGRAM, lastSharedView: DiagramView.EDIT },
    isExpired: true,
  },
}

/** Choosing "Open" closes the menu and reports the open action to the caller. */
export const OpensDiagram: Story = {
  tags: ["test", "!autodocs", "!dev"],
  parameters: openMenuA11y,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /open diagram actions/i })
    )
    const body = within(document.body)
    await userEvent.click(
      await body.findByRole("menuitem", { name: /^open$/i })
    )
    await expect(args.onOpen).toHaveBeenCalledTimes(1)
    await expect(args.onDelete).not.toHaveBeenCalled()
  },
}

/**
 * Deleting a local diagram routes through the destructive `AlertDialog`: the
 * menu item arms the confirmation, and only confirming there fires `onDelete`.
 */
export const DeleteConfirms: Story = {
  tags: ["test", "!autodocs", "!dev"],
  parameters: openMenuA11y,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(document.body)

    await userEvent.click(
      canvas.getByRole("button", { name: /open diagram actions/i })
    )
    await userEvent.click(
      await body.findByRole("menuitem", { name: /^delete$/i })
    )
    // Arming the confirmation must NOT delete yet — the dialog gates it.
    await expect(args.onDelete).not.toHaveBeenCalled()

    const dialog = await body.findByRole("alertdialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: /^delete$/i })
    )
    await expect(args.onDelete).toHaveBeenCalledTimes(1)
  },
}

/** Choosing "Copy link" on a shared diagram reports the copy action. */
export const CopiesSharedLink: Story = {
  tags: ["test", "!autodocs", "!dev"],
  parameters: openMenuA11y,
  args: { diagram: SAMPLE_SHARED_DIAGRAM },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /open diagram actions/i })
    )
    const body = within(document.body)
    await userEvent.click(
      await body.findByRole("menuitem", { name: /copy link/i })
    )
    await expect(args.onCopySharedLink).toHaveBeenCalledTimes(1)
  },
}
