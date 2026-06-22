import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import {
  PlaygroundDefaultModel,
  playgroundModelId,
} from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { resetPersistenceStore } from "../../stories/_support/persistence"
import { AssessmentDataBox } from "./AssessmentDataBox"

/**
 * The playground debug panel listing the assessment-selected element ids and,
 * when an id resolves to assessment data on the playground diagram, its
 * name / score / feedback / elementType. It reads the playground model out of
 * `usePersistenceModelStore`, so the stories seed that entry; with the default
 * (empty) playground diagram no id resolves, so the panel shows just the id list
 * — the common debugging state. It returns `null` when nothing is selected.
 */

/** Seed the persistence store with the playground entry the panel reads. */
function seedPlayground() {
  resetPersistenceStore()
  const now = "2026-06-15T10:00:00.000Z"
  usePersistenceModelStore.setState((s) => ({
    models: {
      ...s.models,
      [playgroundModelId]: {
        id: playgroundModelId,
        model: PlaygroundDefaultModel,
        lastModifiedAt: now,
        createdAt: now,
        favorite: false,
      },
    },
  }))
}

const meta = {
  title: "Webapp/Misc/AssessmentDataBox",
  component: AssessmentDataBox,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    assessmentSelectedElements: ["node-element-1", "edge-element-2"],
  },
  argTypes: {
    assessmentSelectedElements: {
      control: "object",
      description: "Element ids currently selected for assessment.",
      table: { category: "Data" },
    },
  },
  beforeEach: seedPlayground,
} satisfies Meta<typeof AssessmentDataBox>

export default meta
type Story = StoryObj<typeof meta>

/** Two selected ids — the id list (no detail rows on the empty playground). */
export const Default: Story = {}

/** A single selected id. */
export const SingleSelection: Story = {
  args: { assessmentSelectedElements: ["node-element-1"] },
}

/** Nothing selected — the panel renders nothing. */
export const Empty: Story = {
  args: { assessmentSelectedElements: [] },
}

/** The selected ids are listed in the panel. */
export const ListsSelectedIds: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/selected elements ids/i)).toBeInTheDocument()
    await expect(canvas.getByText(/node-element-1/)).toBeInTheDocument()
  },
}
