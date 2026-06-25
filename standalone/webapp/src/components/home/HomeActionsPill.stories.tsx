import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLDiagramType } from "@tumaet/apollon"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeActionsPill } from "./HomeActionsPill"
import { useHomeChrome } from "./useHomeChrome"

/**
 * The mobile (< md) home actions pill — direct ★ Favorites · Refine · ⬆ Import,
 * then a "…" overflow holding only the lower-frequency Theme + Help/legal items.
 * The overflow uses the @tumaet/ui DropdownMenu defaults (editor-matched
 * typography/padding) with a `min-h-11` floor per row for 44px touch targets.
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

/** The resting pill surfaces Favorites, Import, and the "…" overflow directly. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /show favorites only/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /import diagram/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /more options/i })
    ).toBeInTheDocument()
  },
}

/** Opening the overflow shows the lower-frequency Theme + legal links. */
export const OverflowMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /more options/i }))
    const menu = within(canvasElement.ownerDocument.body)
    await expect(await menu.findByText(/theme/i)).toBeInTheDocument()
    await expect(await menu.findByText(/imprint/i)).toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: "dark" },
}
