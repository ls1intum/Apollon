import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLModel } from "@tumaet/apollon"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { playgroundModelId } from "@/constants/playgroundDefaultDiagram"
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

const makeModel = (
  id: string,
  title: string,
  type: UMLModel["type"],
  withContent: boolean
): UMLModel =>
  ({
    version: "4.0.0",
    id,
    title,
    type,
    nodes: withContent
      ? [
          {
            id: `${id}-node`,
            type,
            position: { x: 0, y: 0 },
            width: 200,
            height: 110,
            data: {},
          },
        ]
      : [],
    edges: [],
    assessments: {},
  }) as unknown as UMLModel

// A spread of types, titles, and timestamps so the type/sort filters and the
// search box all have something meaningful to act on.
const seedDiagrams: {
  id: string
  title: string
  type: UMLModel["type"]
  lastModifiedAt: string
  favorite?: boolean
  empty?: boolean
}[] = [
  {
    id: "diagram-bank",
    title: "Banking Domain Model",
    type: "ClassDiagram",
    lastModifiedAt: "2026-06-15T10:00:00.000Z",
    favorite: true,
  },
  {
    id: "diagram-checkout",
    title: "Checkout Activity",
    type: "ActivityDiagram",
    lastModifiedAt: "2026-06-12T09:30:00.000Z",
  },
  {
    id: "diagram-auth",
    title: "Authentication Use Cases",
    type: "UseCaseDiagram",
    lastModifiedAt: "2026-06-10T14:15:00.000Z",
  },
  {
    id: "diagram-deploy",
    title: "Deployment Topology",
    type: "DeploymentDiagram",
    lastModifiedAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "diagram-empty",
    title: "Empty Sketch",
    type: "ClassDiagram",
    lastModifiedAt: "2026-05-20T16:45:00.000Z",
    empty: true,
  },
]

const seedStore = () => {
  const now = new Date().toISOString()
  usePersistenceModelStore.setState({
    models: {
      // Keep the playground entry — the gallery filters it out by id, so it
      // mirrors the real store shape without polluting the grid.
      [playgroundModelId]: usePersistenceModelStore.getState().models[
        playgroundModelId
      ] ?? {
        id: playgroundModelId,
        model: makeModel(playgroundModelId, "Playground", "ClassDiagram", true),
        lastModifiedAt: now,
        createdAt: now,
        favorite: false,
      },
      ...Object.fromEntries(
        seedDiagrams.map((diagram) => [
          diagram.id,
          {
            id: diagram.id,
            model: makeModel(
              diagram.id,
              diagram.title,
              diagram.type,
              !diagram.empty
            ),
            lastModifiedAt: diagram.lastModifiedAt,
            createdAt: diagram.lastModifiedAt,
            favorite: Boolean(diagram.favorite),
          },
        ])
      ),
    },
    currentModelId: null,
  })
}

const meta = {
  title: "Webapp/Home/DiagramGallery",
  component: DiagramGallery,
  parameters: { layout: "padded" },
  decorators: [WebappProviders],
  // Reset to a playground-only store before each story so a populated story
  // never bleeds diagrams into the empty-state story (and vice versa).
  beforeEach: () => {
    usePersistenceModelStore.setState({
      models: {},
      currentModelId: null,
    })
  },
} satisfies Meta<typeof DiagramGallery>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A populated grid: five local diagrams across several types, one favorited and
 * one empty.
 */
export const Populated: Story = {
  beforeEach: seedStore,
}

/**
 * The empty state, shown when the store holds no local diagrams. Prompts the
 * user to create or import one.
 */
export const Empty: Story = {
  // No seeding — the meta `beforeEach` already cleared the store.
}

/**
 * Populated grid pinned to dark mode to review card surfaces and the
 * control-row contrast.
 */
export const Dark: Story = {
  beforeEach: seedStore,
  globals: { theme: "dark" },
}

/**
 * Typing in the search box filters the grid down to the matching diagram and
 * updates the count label.
 */
export const SearchFilters: Story = {
  beforeEach: seedStore,
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
