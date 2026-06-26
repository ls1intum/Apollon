import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { DarkNavbarSurface } from "@/stories/_support/webapp"
import {
  makeAutoVersion,
  makePendingVersion,
  makeVersion,
} from "@/stories/_support/versioning"
import { VersionListItemView } from "./VersionListItem"

/**
 * A single pure row in the version-history list. Renders a per-version
 * thumbnail (slotted as a node), the description / autosave caption, the
 * `#N · time-ago` line, and a kebab menu (restore / copy link / edit
 * description / delete). All side effects are reported via callbacks
 * (`onPreview` / `onRestore` / `onDelete` / `onEditDescription` / `onCopyLink`);
 * the view owns only the inline-edit draft.
 *
 * The live `VersionThumbnail` (which mounts an editor + fetches a body) is
 * injected by the container; the view takes the thumbnail as a `thumbnail` prop,
 * so these stories pass a static placeholder and run real interaction tests.
 */

/** A static stand-in for the slotted live thumbnail. */
const thumbnailPlaceholder = (
  <div className="h-10 w-16 rounded bg-white/10" aria-hidden />
)

const namedVersion = makeVersion({
  id: "version-named",
  seq: 7,
  name: "Add payment flow",
  description: "Add payment flow and reconcile the account aggregate.",
  createdAt: "2026-06-15T10:00:00.000Z",
})

const autoVersion = makeAutoVersion({
  id: "version-auto",
  seq: 6,
  createdAt: "2026-06-14T09:00:00.000Z",
})

const pendingVersion = makePendingVersion({
  id: "version-pending",
  description: "Saving milestone…",
  createdAt: "2026-06-16T08:00:00.000Z",
})

const meta = {
  title: "Webapp/Versioning/VersionListItem",
  component: VersionListItemView,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    DarkNavbarSurface,
    (Story) => (
      // The list paints onto the themed chrome surface; wrap in the same
      // `role="list"` <ul> the production VersionDrawer uses, so the row's
      // native `listitem` semantics have their list parent and the markup is
      // valid. (The row is a plain `<li>`, not a `role="option"`, so nothing
      // nests interactive content — axe: nested-interactive.)
      <ul
        role="list"
        aria-label="Version history"
        className="m-0 w-80 list-none p-0"
      >
        <Story />
      </ul>
    ),
  ],
  args: {
    version: namedVersion,
    thumbnail: thumbnailPlaceholder,
    versionNumber: 7,
    isPreviewing: false,
    canRestore: true,
    onPreview: fn(),
    onRestore: fn(),
    onDelete: fn(),
    onEditDescription: fn(),
    onCopyLink: fn(),
  },
  argTypes: {
    thumbnail: {
      control: false,
      description: "Slotted per-version thumbnail node (container-injected).",
      table: { category: "Data" },
    },
    version: {
      control: false,
      description: "The version this row represents.",
      table: { category: "Data" },
    },
    versionNumber: {
      control: { type: "number" },
      description: "Display rank among saved versions; undefined for pending.",
      table: { category: "Data" },
    },
    isPreviewing: {
      control: "boolean",
      description: "Highlights the row as the currently-previewed version.",
      table: { category: "State" },
    },
    canRestore: {
      control: "boolean",
      description: "Hides the Restore action when restoring would be a no-op.",
      table: { category: "State" },
    },
    onPreview: {
      description: "Called with the version id when the row is clicked.",
      table: { category: "Events" },
    },
    onRestore: {
      description: 'Called when "Restore this version" is chosen.',
      table: { category: "Events" },
    },
    onDelete: {
      description: 'Called when "Delete" is chosen.',
      table: { category: "Events" },
    },
    onEditDescription: {
      description: "Persists a new description; rejects to revert the draft.",
      table: { category: "Events" },
    },
    onCopyLink: {
      description: "Copies a shareable permalink to the clipboard.",
      table: { category: "Events" },
    },
    className: {
      control: "text",
      description: "Merged onto the root <li> classes.",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<typeof VersionListItemView>

export default meta
type Story = StoryObj<typeof meta>

/** A user-named version with a description and a full kebab (incl. delete). */
export const Named: Story = {}

/** A raw auto-save: italic "Auto-saved" caption, no delete in the kebab. */
export const Autosave: Story = {
  args: { version: autoVersion, versionNumber: 6 },
}

/** The currently-previewed row, highlighted via the selected background. */
export const Previewing: Story = {
  args: { isPreviewing: true },
}

/** An optimistic pending row: reduced opacity, "Saving" caption, disabled menu. */
export const Pending: Story = {
  args: { version: pendingVersion, versionNumber: undefined },
}

/** Clicking the row reports a preview request with the version id. */
export const ClickPreviews: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    // No router in stories → no stretched `<Link>`; the plain `<li>` row body
    // owns the click (handleRowClick).
    await userEvent.click(canvas.getByRole("listitem"))
    await expect(args.onPreview).toHaveBeenCalledWith(namedVersion.id)
  },
}

/** The kebab menu portals to the body; Restore reports the version id. */
export const RestoreFromMenu: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /version actions/i })
    )
    const menu = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      await menu.findByRole("menuitem", { name: /restore/i })
    )
    await expect(args.onRestore).toHaveBeenCalledWith(namedVersion.id)
  },
}

/** "Copy link" from the kebab reports the version id to `onCopyLink`. */
export const CopyLinkFromMenu: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /version actions/i })
    )
    const menu = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      await menu.findByRole("menuitem", { name: /copy link/i })
    )
    await expect(args.onCopyLink).toHaveBeenCalledWith(namedVersion.id)
  },
}

/**
 * "Delete" is offered only for named versions — a raw auto-save's kebab omits
 * it (and "Add description" replaces "Edit description").
 */
export const AutosaveMenuOmitsDelete: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { version: autoVersion, versionNumber: 6 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /version actions/i })
    )
    const menu = within(canvasElement.ownerDocument.body)
    await expect(
      await menu.findByRole("menuitem", { name: /add description/i })
    ).toBeInTheDocument()
    expect(menu.queryByRole("menuitem", { name: /^delete$/i })).toBeNull()
  },
}

/**
 * Editing the description inline through the kebab and submitting with
 * Cmd/Ctrl+Enter persists the trimmed draft via `onEditDescription`.
 */
export const EditDescriptionFromMenu: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /version actions/i })
    // Open the menu, retrying the click until it actually opens. In the shared
    // document.body of the portable-stories runner, a leaked overlay from a
    // neighbouring story can swallow the first click (Base UI treats it as an
    // outside-press); re-click until aria-expanded flips so the test is order-
    // independent.
    await waitFor(async () => {
      if (trigger.getAttribute("aria-expanded") !== "true") {
        await userEvent.click(trigger)
      }
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    })
    // Scope to the menu THIS trigger opened. Base UI portals the menu to
    // document.body, so a leaked menu from a neighbouring story (shared body)
    // could otherwise capture the click and leave this row in display mode.
    const body = canvasElement.ownerDocument.body
    const menuItem = await waitFor(() => {
      const id = trigger.getAttribute("aria-controls")
      const root = (id && body.querySelector(`#${CSS.escape(id)}`)) || body
      return within(root as HTMLElement).getByRole("menuitem", {
        name: /edit description/i,
      })
    })
    await userEvent.click(menuItem)
    const field = await canvas.findByRole("textbox", {
      name: /edit description/i,
    })
    await userEvent.clear(field)
    await userEvent.type(field, "Reworked aggregate boundaries")
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}")
    await waitFor(() =>
      expect(args.onEditDescription).toHaveBeenCalledWith(
        namedVersion.id,
        "Reworked aggregate boundaries"
      )
    )
  },
}
