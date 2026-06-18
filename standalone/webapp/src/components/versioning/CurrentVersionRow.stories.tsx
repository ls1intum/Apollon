import type { Meta, StoryObj } from "@storybook/react-vite"
import type { UMLModel } from "@tumaet/apollon/react"
import { useVersionStore, type PendingVersion } from "@/stores/useVersionStore"
import { CurrentVersionRow } from "./CurrentVersionRow"

/**
 * The HEAD pseudo-row at the top of the version sidebar ("you are here"). It has
 * three resting states — up to date (green check), edits since last save (amber
 * dot), and no snapshot yet (muted circle) — plus a "Return to current" form
 * while previewing an earlier version. Preview state comes from
 * `useVersionStore`, seeded per story and reset in the meta `beforeEach`.
 */
const latestSaved: PendingVersion = {
  id: "v-latest",
  diagramId: "diagram-1",
  name: "Milestone 1",
  description: "",
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  kind: "user",
  librarySchemaVersion: "1.0.0",
  seq: 3,
}

const meta = {
  title: "Webapp/Versioning/CurrentVersionRow",
  component: CurrentVersionRow,
  parameters: { layout: "centered" },
  // The sidebar surface is always dark; preview the row on a matching strip.
  decorators: [
    (Story) => (
      <div className="w-80 bg-[#1f2123]">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    useVersionStore.setState({ preview: null })
  },
  args: {
    hasChanges: false,
    latestSavedVersion: latestSaved,
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CurrentVersionRow>

export default meta
type Story = StoryObj<typeof meta>

/** Canvas matches the last snapshot — green check, "Up to date". */
export const UpToDate: Story = {}

/** Edits exist since the last snapshot — amber filled dot. */
export const EditsSinceSave: Story = {
  args: { hasChanges: true },
}

/** No snapshot has ever been taken — muted outline circle. */
export const NoSnapshot: Story = {
  args: { latestSavedVersion: undefined },
}

/** While previewing an earlier version the row becomes "Return to current". */
export const Previewing: Story = {
  beforeEach: () => {
    useVersionStore.setState({
      preview: { versionId: "v-older", body: {} as UMLModel },
    })
  },
}

/** Pinned dark — the row lives on the always-dark sidebar. */
export const Dark: Story = {
  globals: { theme: "dark" },
}
