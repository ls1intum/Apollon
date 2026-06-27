import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { HomeNewFab } from "./HomeNewFab"

/**
 * The mobile-only (< md) "New diagram" FAB — statically pinned bottom-center,
 * clear of the home-indicator safe area, painting accent-tinted `.apollon-glass`.
 * Rendered here on a tall plate so the fixed pin is visible in the frame.
 */
const meta = {
  title: "Webapp/Home/HomeNewFab",
  component: HomeNewFab,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="relative h-[420px] bg-[var(--apollon-chrome-surface)]">
        <Story />
      </div>
    ),
  ],
  globals: { viewport: { value: "mobile1" } },
  args: { onNewDiagram: fn() },
  argTypes: {
    onNewDiagram: {
      description: "Called when the FAB is activated to start a new diagram.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof HomeNewFab>

export default meta
type Story = StoryObj<typeof meta>

/** The resting FAB, pinned bottom-center on the mobile plate. */
export const Default: Story = {}

/** Tapping the FAB reports the "new diagram" action to the caller. */
export const Activates: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /new diagram/i }))
    await expect(args.onNewDiagram).toHaveBeenCalledTimes(1)
  },
}

/** Dark theme — the FAB paints accent-tinted glass against the dark plate. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark", viewport: { value: "mobile1" } },
}
