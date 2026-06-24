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
    diagram: { control: "object", table: { category: "Data" } },
    isExpired: { control: "boolean", table: { category: "State" } },
    canDelete: { control: "boolean", table: { category: "State" } },
    onOpen: { action: "open", table: { category: "Events" } },
    onDuplicate: { action: "duplicate", table: { category: "Events" } },
    onDelete: { action: "delete", table: { category: "Events" } },
    onShare: { action: "share", table: { category: "Events" } },
    onCopySharedLink: {
      action: "copySharedLink",
      table: { category: "Events" },
    },
    onSaveLocalCopy: {
      action: "saveLocalCopy",
      table: { category: "Events" },
    },
    onChangeSharedView: {
      action: "changeSharedView",
      table: { category: "Events" },
    },
    onRemoveSharedEntry: {
      action: "removeSharedEntry",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof DiagramActionsMenuView>

export default meta
type Story = StoryObj<typeof meta>

/** A local diagram: open, duplicate, delete. */
export const LocalDiagram: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /open diagram actions/i })
    )
    const body = within(document.body)
    await userEvent.click(
      await body.findByRole("menuitem", { name: /^open$/i })
    )
    await expect(args.onOpen).toHaveBeenCalled()
  },
}

/** A shared diagram: copy link, change sharing mode, remove entry. */
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
