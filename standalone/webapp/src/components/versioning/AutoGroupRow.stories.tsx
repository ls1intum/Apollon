import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { DarkNavbarSurface } from "@/stories/_support/webapp"
import { SAMPLE_DIAGRAM_ID, makeAutoGroup } from "@/stories/_support/versioning"
import { AutoGroupRow } from "./AutoGroupRow"

/**
 * The collapsed expander row that stands in for a run of consecutive auto-saved
 * (unnamed) versions in the version sidebar. Collapsed it shows "{n} auto-saved
 * versions"; expanding mounts the individual `VersionListItem`s — each of which
 * renders a live `VersionThumbnail` (an embedded ApollonEditor). These are
 * therefore visual-only stories (`!test`).
 */

const meta = {
  title: "Webapp/Versioning/AutoGroupRow",
  component: AutoGroupRow,
  parameters: { layout: "centered" },
  // Expanding mounts VersionThumbnail (a live ApollonEditor) under the runner.
  tags: ["autodocs", "!test"],
  decorators: [
    DarkNavbarSurface,
    (Story) => (
      <div role="listbox" aria-label="Version history" className="w-80 py-1">
        <Story />
      </div>
    ),
  ],
  args: {
    diagramId: SAMPLE_DIAGRAM_ID,
    onPreview: fn(),
    onRestore: fn(),
    onDelete: fn(),
    activeRowId: null,
    previewingVersionId: null,
    versionNumberById: new Map<string, number>(),
    latestSavedId: undefined,
    hasUnsavedChanges: false,
  },
  argTypes: {
    group: {
      control: false,
      description: "The run of consecutive auto-saved versions to collapse.",
      table: { category: "Data" },
    },
    diagramId: {
      control: false,
      description: "The diagram the versions belong to.",
      table: { category: "Data" },
    },
    versionNumberById: {
      control: false,
      description: "Maps version id → display rank, passed to each child row.",
      table: { category: "Data" },
    },
    latestSavedId: {
      control: "text",
      description: "Id of the latest saved version; gates each row's Restore.",
      table: { category: "Data" },
    },
    activeRowId: {
      control: "text",
      description: "Id of the keyboard-active row in the listbox.",
      table: { category: "State" },
    },
    previewingVersionId: {
      control: "text",
      description: "Id of the version currently being previewed.",
      table: { category: "State" },
    },
    hasUnsavedChanges: {
      control: "boolean",
      description:
        "Whether the canvas has unsaved edits vs the latest saved version.",
      table: { category: "State" },
    },
    onPreview: {
      action: "preview",
      description: "Called with the version id when a child row is clicked.",
      table: { category: "Events" },
    },
    onRestore: {
      action: "restore",
      description: 'Called when a child row\'s "Restore" is chosen.',
      table: { category: "Events" },
    },
    onDelete: {
      action: "delete",
      description: 'Called when a child row\'s "Delete" is chosen.',
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof AutoGroupRow>

export default meta
type Story = StoryObj<typeof meta>

/** A collapsed group of five auto-saved versions. */
export const Default: Story = {
  args: { group: makeAutoGroup(5) },
}

/** A large run of auto-saves. */
export const ManyVersions: Story = {
  args: { group: makeAutoGroup(24) },
}

/** Group whose lead row is the active/selected row in the listbox. */
export const Active: Story = {
  args: {
    group: makeAutoGroup(5),
    activeRowId: "auto-1",
  },
}
