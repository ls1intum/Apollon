import { useMemo, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { UMLDiagramType } from "@tumaet/apollon"
import { expect, userEvent, within } from "storybook/test"
import {
  resetPersistenceStore,
  seedGallery,
} from "../../stories/_support/persistence"
import { WebappProviders } from "../../stories/_support/webapp"
import { DiagramGallery } from "./DiagramGallery"
import { HomeHeaderRow } from "./HomeHeaderRow"
import { useHomeChrome } from "./useHomeChrome"
import { getDiagramTypeLabel } from "./diagramTypeMeta"

/**
 * The real home composition: the Home Island Band over the diagram cards grid.
 *
 * `useHomeChrome` owns the search / favorites / source / type / sort refinement
 * state ONCE; it is handed to BOTH the band (which renders the controls) and the
 * gallery (which reads it to filter/sort). The gallery reports its filtered
 * count and the present diagram types back up so the band can render them — the
 * same single-source-of-truth wiring `HomePage` uses in production.
 *
 * These stories stay on the "local" source so no on-mount network fetch runs —
 * the shared-diagram source is the only path that hits the API, and we never
 * switch to it here.
 */
function HomeGalleryHarness() {
  const chrome = useHomeChrome()
  const [count, setCount] = useState(0)
  const [presentTypes, setPresentTypes] = useState<readonly UMLDiagramType[]>(
    []
  )
  const typeOptions = useMemo(
    () =>
      [...presentTypes].sort((firstType, secondType) =>
        getDiagramTypeLabel(firstType).localeCompare(
          getDiagramTypeLabel(secondType)
        )
      ),
    [presentTypes]
  )

  return (
    <div className="flex flex-col gap-6">
      <HomeHeaderRow chrome={chrome} count={count} typeOptions={typeOptions} />
      <DiagramGallery
        chrome={chrome}
        onCountChange={setCount}
        onTypeOptionsChange={setPresentTypes}
      />
    </div>
  )
}

const meta = {
  title: "Webapp/Home/DiagramGallery",
  component: HomeGalleryHarness,
  parameters: { layout: "padded" },
  decorators: [WebappProviders],
  // Reset to an empty store before each story so a populated story never bleeds
  // diagrams into the empty-state story (and vice versa).
  beforeEach: resetPersistenceStore,
} satisfies Meta<typeof HomeGalleryHarness>

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
 * Typing in the band's search field filters the grid down to the matching
 * diagram and updates the count chip.
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
