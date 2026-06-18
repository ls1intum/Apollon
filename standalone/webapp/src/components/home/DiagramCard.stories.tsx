import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLModel } from "@tumaet/apollon"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import { DiagramView } from "@/types"
import { WebappProviders } from "../../stories/_support/webapp"
import { DiagramCard, type RecentDiagram } from "./DiagramCard"

const LOCAL_ID = "local-demo-1"

const localDiagram: RecentDiagram = {
  id: LOCAL_ID,
  title: "Order Processing",
  type: "ClassDiagram",
  lastModifiedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  favorite: false,
  source: "local",
}

const sharedDiagram: RecentDiagram = {
  id: "shared-demo-1",
  title: "Team Architecture",
  type: "ComponentDiagram",
  lastModifiedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  favorite: true,
  source: "shared",
  lastSharedView: DiagramView.EDIT,
}

const seedModel = (diagram: RecentDiagram) => {
  const now = new Date().toISOString()
  const model = {
    id: diagram.id,
    type: diagram.type,
    title: diagram.title,
    version: "4.0.0",
    nodes: [],
    edges: [],
    assessments: {},
  } as unknown as UMLModel
  usePersistenceModelStore.setState({
    models: {
      [diagram.id]: {
        id: diagram.id,
        model,
        lastModifiedAt: diagram.lastModifiedAt,
        createdAt: now,
        favorite: diagram.favorite,
      },
    },
    currentModelId: null,
    thumbnails: {},
    thumbnailRevisions: {},
    thumbnailLastModifiedAt: {},
  })
}

/**
 * A single diagram tile on the dashboard: type icon/thumbnail, title, relative
 * last-modified date, type/source badges, a favorite star, and the three-dot
 * `DiagramActionsMenu` (Open / Duplicate / Share / Delete for local diagrams).
 *
 * The card reads the persistence store for thumbnails and favorite/delete
 * actions, so each story seeds the store in `beforeEach`.
 */
const meta = {
  title: "Webapp/Home/DiagramCard",
  component: DiagramCard,
  tags: ["autodocs"],
  decorators: [
    WebappProviders,
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
  args: {
    diagram: localDiagram,
    showPlaceholderIcon: true,
  },
  beforeEach: () => {
    usePersistenceModelStore.setState({
      models: {},
      currentModelId: null,
      thumbnails: {},
      thumbnailRevisions: {},
      thumbnailLastModifiedAt: {},
    })
  },
} satisfies Meta<typeof DiagramCard>

export default meta
type Story = StoryObj<typeof meta>

/** A local diagram with the type placeholder icon. */
export const LocalDiagram: Story = {
  beforeEach: () => seedModel(localDiagram),
}

/** A favorited shared diagram, showing its sharing-mode badge. */
export const SharedDiagram: Story = {
  args: { diagram: sharedDiagram, showSourceBadge: true },
  beforeEach: () => seedModel(sharedDiagram),
}

/**
 * No thumbnail yet and not a placeholder — the card shows its loading spinner.
 */
export const Loading: Story = {
  args: { showPlaceholderIcon: false, isThumbnailLoading: true },
  beforeEach: () => seedModel(localDiagram),
}

/** A highlighted (just-created/imported) card with the pulse treatment. */
export const Highlighted: Story = {
  args: { isHighlighted: true },
  beforeEach: () => seedModel(localDiagram),
}

/** An expired shared diagram — overlay and disabled interactions. */
export const Expired: Story = {
  args: { diagram: sharedDiagram, isExpired: true },
  beforeEach: () => seedModel(sharedDiagram),
}

/** Pinned dark-theme review. */
export const Dark: Story = {
  globals: { theme: "dark" },
  beforeEach: () => seedModel(localDiagram),
}

/**
 * Opening the three-dot menu reveals the local-diagram actions. The menu
 * renders into a body portal, so it is queried there.
 */
export const ActionsMenuOpens: Story = {
  beforeEach: () => seedModel(localDiagram),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /open diagram actions/i })
    )

    const body = within(document.body)
    await expect(
      await body.findByRole("menuitem", { name: /^open$/i })
    ).toBeInTheDocument()
    await expect(
      body.getByRole("menuitem", { name: /duplicate/i })
    ).toBeInTheDocument()
    await expect(
      body.getByRole("menuitem", { name: /delete/i })
    ).toBeInTheDocument()
  },
}

/** Toggling the favorite star flips the store's favorite flag. */
export const FavoriteToggles: Story = {
  beforeEach: () => seedModel(localDiagram),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const star = canvas.getByRole("button", { name: /add to favorites/i })
    await userEvent.click(star)
    await expect(
      usePersistenceModelStore.getState().models[LOCAL_ID].favorite
    ).toBe(true)
  },
}
