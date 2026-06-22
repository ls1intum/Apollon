import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import {
  resetPersistenceStore,
  seedGallery,
} from "../../stories/_support/persistence"
import { WebappProviders } from "../../stories/_support/webapp"
import { DiagramGallery } from "./DiagramGallery"

/**
 * The home page's diagram grid. It reads local diagrams from
 * `usePersistenceModelStore` (the playground entry is filtered out) and renders
 * a searchable, filterable, sortable gallery with grid/table view modes plus an
 * empty state when no diagrams exist.
 *
 * These stories stay on the "local" source so no on-mount network fetch runs —
 * the shared-diagram tab is the only path that hits the API, and we never
 * switch to it here.
 */
const meta = {
  title: "Webapp/Home/DiagramGallery",
  component: DiagramGallery,
  parameters: { layout: "padded" },
  decorators: [WebappProviders],
  // Reset to an empty store before each story so a populated story never bleeds
  // diagrams into the empty-state story (and vice versa).
  beforeEach: resetPersistenceStore,
} satisfies Meta<typeof DiagramGallery>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A populated grid: five local diagrams across several types, one favorited and
 * one empty.
 */
export const Populated: Story = {
  beforeEach: () => seedGallery(),
}

/**
 * The empty state, shown when the store holds no local diagrams. Prompts the
 * user to create or import one.
 */
export const Empty: Story = {
  // No seeding — the meta `beforeEach` already cleared the store.
}

/**
 * Typing in the search box filters the grid down to the matching diagram and
 * updates the count label.
 */
export const SearchFilters: Story = {
  beforeEach: () => seedGallery(),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step("all seeded diagrams render", async () => {
      await expect(
        await canvas.findByText("Banking Domain Model")
      ).toBeInTheDocument()
      await expect(canvas.getByText("Checkout Activity")).toBeInTheDocument()
    })

    await step("searching narrows the grid", async () => {
      const search = canvas.getByRole("searchbox", {
        name: /search diagrams by name/i,
      })
      await userEvent.type(search, "checkout")
      await expect(
        await canvas.findByText("Checkout Activity")
      ).toBeInTheDocument()
      await expect(
        canvas.queryByText("Banking Domain Model")
      ).not.toBeInTheDocument()
    })
  },
}
