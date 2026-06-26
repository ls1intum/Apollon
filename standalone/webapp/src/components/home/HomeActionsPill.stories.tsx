import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLDiagramType } from "@tumaet/apollon"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeActionsPill } from "./HomeActionsPill"
import { useHomeChrome } from "./useHomeChrome"

/**
 * The mobile (< md) home actions pill — direct ★ Favorites · Refine · Import,
 * then a small Help▾ dropdown (the shared Help/legal body) and a 1-tap Theme
 * toggle, in the same left-to-right order as the desktop actions island. Every
 * icon-only control wears the shared instant-reveal Tooltip as its visible name.
 */

const MOCK_TYPES: UMLDiagramType[] = ["ClassDiagram", "ActivityDiagram"]

function ActionsPillHarness() {
  const chrome = useHomeChrome()
  return (
    <HomeActionsPill
      chrome={chrome}
      typeOptions={MOCK_TYPES}
      onImportJson={() => {}}
    />
  )
}

const meta = {
  title: "Webapp/Home/HomeActionsPill",
  component: ActionsPillHarness,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    WebappProviders,
    (Story) => (
      <div className="bg-[var(--apollon-chrome-surface)] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionsPillHarness>

export default meta
type Story = StoryObj<typeof meta>

/** The resting pill surfaces Favorites, Refine, Import, Help, and Theme. */
export const Default: Story = {}

/** Tapping Favorites toggles the filter — the button's pressed state + name flip. */
export const FavoritesToggle: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const favorites = canvas.getByRole("button", {
      name: /show favorites only/i,
    })
    await expect(favorites).toHaveAttribute("aria-pressed", "false")

    await userEvent.click(favorites)

    const active = canvas.getByRole("button", { name: /show all diagrams/i })
    await expect(active).toHaveAttribute("aria-pressed", "true")
  },
}

/** Opening Help reveals the shared About + legal (Imprint) entries. */
export const HelpMenu: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /^help$/i }))
    const menu = within(canvasElement.ownerDocument.body)
    await expect(await menu.findByText("About")).toBeInTheDocument()
    await expect(menu.getByText("Imprint")).toBeInTheDocument()
  },
}

/** Dark theme — the pill paints themed glass + flips text/border. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
}
