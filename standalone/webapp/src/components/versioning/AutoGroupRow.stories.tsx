import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { PendingVersion } from "@/stores/useVersionStore"
import AutoGroupRow from "./AutoGroupRow"

/**
 * The collapsed expander row that stands in for a run of consecutive auto-saved
 * (unnamed) versions in the version sidebar. Collapsed it shows "{n} auto-saved
 * versions"; expanding mounts the individual `VersionListItem`s — each of which
 * renders a live `VersionThumbnail` (an embedded ApollonEditor). These are
 * therefore visual-only stories (`!test`).
 */
const DIAGRAM_ID = "diagram-1"

const makeVersion = (n: number): PendingVersion => ({
  id: `auto-${n}`,
  diagramId: DIAGRAM_ID,
  name: "",
  description: "",
  createdAt: new Date(Date.now() - n * 60_000).toISOString(),
  kind: "auto",
  librarySchemaVersion: "1.0.0",
  seq: 10 + n,
})

const makeGroup = (count: number) => {
  const versions = Array.from({ length: count }, (_, i) => makeVersion(i + 1))
  return {
    kind: "auto-group" as const,
    first: versions[0]!,
    versions,
  }
}

const meta = {
  title: "Webapp/Versioning/AutoGroupRow",
  component: AutoGroupRow,
  parameters: { layout: "centered" },
  // Expanding mounts VersionThumbnail (a live ApollonEditor) under the runner.
  tags: ["autodocs", "!test"],
  decorators: [
    (Story) => (
      <div
        role="listbox"
        aria-label="Version history"
        className="w-80 rounded-md bg-[#1f2123] py-1"
      >
        <Story />
      </div>
    ),
  ],
  args: {
    diagramId: DIAGRAM_ID,
    onPreview: fn(),
    onRestore: fn(),
    onDelete: fn(),
    activeRowId: null,
    previewingVersionId: null,
    versionNumberById: new Map<string, number>(),
    latestSavedId: undefined,
    hasUnsavedChanges: false,
  },
} satisfies Meta<typeof AutoGroupRow>

export default meta
type Story = StoryObj<typeof meta>

/** A collapsed group of five auto-saved versions. */
export const Default: Story = {
  args: { group: makeGroup(5) },
}

/** The smallest group (two versions) that still collapses into an expander. */
export const TwoVersions: Story = {
  args: { group: makeGroup(2) },
}

/** A large run of auto-saves. */
export const ManyVersions: Story = {
  args: { group: makeGroup(24) },
}

/** Group whose lead row is the active/selected row in the listbox. */
export const Active: Story = {
  args: {
    group: makeGroup(5),
    activeRowId: "auto-1",
  },
}

/** Pinned dark — the sidebar surface is always dark. */
export const Dark: Story = {
  args: { group: makeGroup(5) },
  globals: { theme: "dark" },
}
