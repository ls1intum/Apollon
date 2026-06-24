import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import {
  makeSampleThumbnailSources,
  SAMPLE_LOCAL_DIAGRAM,
  SAMPLE_SHARED_DIAGRAM,
} from "../../stories/_support/persistence"
import { DiagramActionsMenuView, DiagramCardView } from "./DiagramCard"

/* A tiny inline thumbnail so the thumbnail-rendering path is reachable without
 * the store: a 1x1 transparent PNG is enough to exercise the <img> branch. */
const TRANSPARENT_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

/* A menu rendered for a card view story; it stays pure by wiring fn() actions. */
const sampleActionsMenu = (
  <DiagramActionsMenuView
    diagram={SAMPLE_LOCAL_DIAGRAM}
    containerClassName="pointer-events-auto relative"
    triggerClassName="flex cursor-pointer items-center justify-center rounded-md p-1"
    onOpen={fn()}
    onDuplicate={fn()}
    onDelete={fn()}
    onShare={fn()}
    onCopySharedLink={fn()}
    onChangeSharedView={fn()}
    onRemoveSharedEntry={fn()}
  />
)

/**
 * A single diagram tile on the dashboard: type icon/thumbnail, title, relative
 * last-modified date, type/source badges, a favorite star, and a slot for the
 * three-dot actions menu.
 *
 * `DiagramCardView` is pure — thumbnail, favorite, loading, expired and
 * highlighted states are all props, and the favorite toggle + card-open report
 * via callbacks. No store, router, or effects, so every state is one `args`
 * combo.
 */
const meta = {
  title: "Webapp/Home/DiagramCard",
  component: DiagramCardView,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 300 }}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "centered" },
  args: {
    diagram: SAMPLE_LOCAL_DIAGRAM,
    showPlaceholderIcon: true,
    isFavorite: false,
    onToggleFavorite: fn(),
    onOpen: fn(),
    actionsMenu: sampleActionsMenu,
  },
  argTypes: {
    diagram: {
      control: "object",
      description: "The diagram tile to render.",
      table: { category: "Data" },
    },
    thumbnail: {
      control: "object",
      description:
        "Pre-rendered light/dark thumbnail data URLs, or `null` for none.",
      table: { category: "Data" },
    },
    actionsMenu: {
      control: false,
      description: "The three-dot actions menu, slotted in by the container.",
      table: { category: "Data" },
    },
    isFavorite: {
      control: "boolean",
      description: "Whether the diagram is favorited (drives the star).",
      table: { category: "State" },
    },
    isThumbnailLoading: {
      control: "boolean",
      description: "Show the loading spinner instead of a thumbnail/icon.",
      table: { category: "State" },
    },
    isExpired: {
      control: "boolean",
      description: "Render the expired overlay and disable interactions.",
      table: { category: "State" },
    },
    isHighlighted: {
      control: "boolean",
      description: "Apply the just-created/imported highlight pulse.",
      table: { category: "State" },
    },
    showPlaceholderIcon: {
      control: "boolean",
      description: "Show the file-document placeholder icon.",
      table: { category: "Appearance" },
    },
    showSourceBadge: {
      control: "boolean",
      description: "Show the secondary Local/Shared source badge.",
      table: { category: "Appearance" },
    },
    className: {
      control: "text",
      description: "Extra classes merged onto the root card.",
      table: { category: "Appearance" },
    },
    onToggleFavorite: {
      action: "toggleFavorite",
      description: "Toggle the favorite star. Omit to hide the star.",
      table: { category: "Events" },
    },
    onOpen: {
      action: "open",
      description: "Called with the diagram route when the card is activated.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof DiagramCardView>

export default meta
type Story = StoryObj<typeof meta>

/** A local diagram with the type placeholder icon. */
export const LocalDiagram: Story = {}

/** A local diagram showing its rendered thumbnail preview. */
export const WithThumbnail: Story = {
  args: {
    showPlaceholderIcon: false,
    thumbnail: { lightDataUrl: TRANSPARENT_PNG, darkDataUrl: TRANSPARENT_PNG },
  },
}

/**
 * The real recolor pipeline on the dark card: a multi-shape diagram SVG is run
 * through `getCachedThumbnailSources` eagerly, so the dark variant is genuinely
 * recolored (light stroke + a cool shape fill that clears WCAG 1.4.11 non-text
 * contrast on #1a1f27), not just the light SVG reused. Rendered in dark so the
 * fix is catchable — a fill that vanished into the card would be visible here.
 */
export const DarkRecoloredThumbnail: Story = {
  globals: { theme: "dark" },
  args: {
    showPlaceholderIcon: false,
    thumbnail: makeSampleThumbnailSources(),
  },
  play: async ({ args }) => {
    // The recolor must produce a dark variant distinct from the light source.
    await expect(args.thumbnail?.darkDataUrl).toBeDefined()
    await expect(args.thumbnail?.darkDataUrl).not.toBe(
      args.thumbnail?.lightDataUrl
    )
  },
}

/** A favorited shared diagram, showing its sharing-mode badge. */
export const SharedDiagram: Story = {
  args: {
    diagram: SAMPLE_SHARED_DIAGRAM,
    showSourceBadge: true,
    isFavorite: true,
    actionsMenu: (
      <DiagramActionsMenuView
        diagram={SAMPLE_SHARED_DIAGRAM}
        containerClassName="pointer-events-auto relative"
        triggerClassName="flex cursor-pointer items-center justify-center rounded-md p-1"
        onOpen={fn()}
        onDuplicate={fn()}
        onDelete={fn()}
        onShare={fn()}
        onCopySharedLink={fn()}
        onChangeSharedView={fn()}
        onRemoveSharedEntry={fn()}
      />
    ),
  },
}

/**
 * No thumbnail yet and not a placeholder — the card shows its loading spinner.
 */
export const Loading: Story = {
  args: { showPlaceholderIcon: false, isThumbnailLoading: true },
}

/** A highlighted (just-created/imported) card with the pulse treatment. */
export const Highlighted: Story = {
  args: { isHighlighted: true },
}

/** An expired shared diagram — overlay and disabled interactions. */
export const Expired: Story = {
  args: {
    diagram: SAMPLE_SHARED_DIAGRAM,
    isExpired: true,
    onToggleFavorite: undefined,
  },
}

/** Toggling the favorite star reports the toggle to the caller. */
export const FavoriteToggles: Story = {
  args: { onToggleFavorite: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const star = canvas.getByRole("button", { name: /add to favorites/i })
    await userEvent.click(star)
    await expect(args.onToggleFavorite).toHaveBeenCalled()
  },
}

/**
 * Opening the three-dot menu reveals the local-diagram actions. The menu
 * renders into a body portal, so it is queried there.
 */
export const ActionsMenuOpens: Story = {
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
