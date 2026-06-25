import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLDiagramType } from "@tumaet/apollon"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeActionsPill } from "./HomeActionsPill"
import { useHomeChrome } from "./useHomeChrome"

/**
 * The mobile (< md) home actions pill — direct ★ Favorites + a "…" overflow
 * dropdown (Refine sheet, Import, Theme, Help/legal). Reuses the editor's themed
 * `[&>*]:min-h-[42px]` dropdown contract for 44px touch targets in both themes.
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

/** Favorites + the "…" overflow are reachable. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: /show favorites only/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /more options/i })
    ).toBeInTheDocument()
  },
}

/** Opening the overflow shows Import, Theme, and the legal links. */
export const OverflowMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /more options/i }))
    const menu = within(canvasElement.ownerDocument.body)
    await expect(await menu.findByText(/import/i)).toBeInTheDocument()
    await expect(await menu.findByText(/imprint/i)).toBeInTheDocument()
  },
}

export const Dark: Story = {
  globals: { theme: "dark" },
}
