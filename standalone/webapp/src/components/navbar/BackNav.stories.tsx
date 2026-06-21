import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { BackNav } from "./BackNav"

/**
 * The shared back/dashboard affordance used by both the (dark) editor navbar and
 * the light popover menu. Renders a real router `<Link>` so cmd/middle-click
 * opens a new tab. `tone` switches between the dark-navbar and light-surface
 * palettes; `onNavigate` fires alongside navigation (e.g. to close a menu).
 */
const meta = {
  title: "Webapp/Navbar/BackNav",
  component: BackNav,
  parameters: { layout: "centered" },
  args: {
    to: "/",
    label: "All diagrams",
    tone: "onDark",
    onNavigate: fn(),
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["onDark", "onSurface"],
      table: { category: "Appearance" },
    },
    to: { control: "text", table: { category: "Navigation" } },
    label: { control: "text", table: { category: "Content" } },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof BackNav>

export default meta
type Story = StoryObj<typeof meta>

/** Default dark-navbar tone, shown on a dark surface. */
export const OnDark: Story = {
  decorators: [
    (Story) => (
      <div className="rounded-md bg-[#1f2123] p-3">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const link = await canvas.findByRole("link", { name: /all diagrams/i })
    await expect(link).toHaveAttribute("href", "/")
    await userEvent.click(link)
    await expect(args.onNavigate).toHaveBeenCalled()
  },
}

/** Light popover-surface tone (editor mobile menu). */
export const OnSurface: Story = {
  args: { tone: "onSurface" },
  decorators: [
    (Story) => (
      <div className="rounded-md bg-card p-3">
        <Story />
      </div>
    ),
  ],
}

/** A custom destination and label. */
export const CustomTarget: Story = {
  args: { to: "/playground", label: "Back to diagram" },
  decorators: [
    (Story) => (
      <div className="rounded-md bg-[#1f2123] p-3">
        <Story />
      </div>
    ),
  ],
}

/** Pinned dark to verify the on-surface tone against dark tokens. */
export const Dark: Story = {
  args: { tone: "onSurface" },
  globals: { theme: "dark" },
  decorators: [
    (Story) => (
      <div className="rounded-md bg-card p-3">
        <Story />
      </div>
    ),
  ],
}
