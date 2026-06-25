import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
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
      action: "preview",
      description: "Called with the version id when the row is clicked.",
      table: { category: "Events" },
    },
    onRestore: {
      action: "restore",
      description: 'Called when "Restore this version" is chosen.',
      table: { category: "Events" },
    },
    onDelete: {
      action: "delete",
      description: 'Called when "Delete" is chosen.',
      table: { category: "Events" },
    },
    onEditDescription: {
      action: "editDescription",
      description: "Persists a new description; rejects to revert the draft.",
      table: { category: "Events" },
    },
    onCopyLink: {
      action: "copyLink",
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
  tags: ["!autodocs"],
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
  tags: ["!autodocs"],
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
