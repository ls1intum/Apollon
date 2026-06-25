import { useEffect, useRef } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import type { UMLDiagramType } from "@tumaet/apollon"
import { WebappProviders } from "../../stories/_support/webapp"
import { HomeHeaderRow } from "./HomeHeaderRow"
import { useHomeChrome } from "./useHomeChrome"

/**
 * The Home Island Band — desktop islands at md+, compact pills below md. Driven
 * by `useHomeChrome` (mocked here with a small diagram set so the count + type
 * options are realistic). Rendered on the theme-following chrome surface so the
 * glass + text contrast match production in both themes.
 */

const MOCK_TYPES: UMLDiagramType[] = [
  "ClassDiagram",
  "ObjectDiagram",
  "ActivityDiagram",
  "UseCaseDiagram",
]

const MOCK_COUNT = 12

/**
 * Harness: owns a real `useHomeChrome` instance and feeds it to the band, so the
 * controls actually mutate state (chips appear, count chip is live).
 */
function HeaderRowHarness({ preset }: { preset?: "default" | "refined" }) {
  const chrome = useHomeChrome()
  const seededRef = useRef(false)

  // Seed the "with active refinements" story once (effect, not render) so the
  // chip line + Refine badge render without a user driving the controls.
  useEffect(() => {
    if (preset !== "refined" || seededRef.current) return
    seededRef.current = true
    chrome.setFavoritesOnly(true)
    chrome.setSource("shared")
    chrome.setType("ClassDiagram")
  }, [preset, chrome])

  return (
    <HomeHeaderRow
      chrome={chrome}
      count={MOCK_COUNT}
      typeOptions={MOCK_TYPES}
      onNewDiagram={() => {}}
      onImportJson={() => {}}
    />
  )
}

const meta = {
  title: "Webapp/Home/HomeHeaderRow",
  component: HeaderRowHarness,
  parameters: { layout: "fullscreen" },
  decorators: [
    WebappProviders,
    (Story) => (
      <div className="bg-[var(--apollon-chrome-surface)] p-4">
        <Story />
      </div>
    ),
  ],
  args: { preset: "default" },
} satisfies Meta<typeof HeaderRowHarness>

export default meta
type Story = StoryObj<typeof meta>

/** Desktop (~1200): brand island, centred search, full actions island. */
export const Desktop: Story = {
  globals: { viewport: { value: "desktop" } },
}

/** Mobile (~360): brand pill, tap-to-search pill, actions overflow pill. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile1" } },
}

/** Active refinements: the chip line + Refine count Badge are visible. */
export const WithActiveRefinements: Story = {
  args: { preset: "refined" },
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByLabelText(/active filters/i)).toBeInTheDocument()
  },
}

/** Dark theme — the band paints themed glass + flips text/border. */
export const Dark: Story = {
  globals: { theme: "dark", viewport: { value: "desktop" } },
}

/** Search, favorites, refine, import, new + theme are all present + reachable. */
export const ControlsPresent: Story = {
  globals: { viewport: { value: "desktop" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByLabelText(/search diagrams by name/i)
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /show favorites only/i })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /new diagram/i })
    ).toBeInTheDocument()
    // Open the Refine popover and confirm the Source block renders.
    await userEvent.click(canvas.getByRole("button", { name: /^refine$/i }))
    const body = within(canvasElement.ownerDocument.body)
    await expect(await body.findByText(/^Source$/)).toBeInTheDocument()
  },
}
