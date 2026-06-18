import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"
import { KeyboardArrowDownIcon, MoonIcon, SunIcon } from "./index"

/**
 * The hand-rolled SVG icons used outside the design-system icon set: the
 * theme-toggle sun/moon and the dropdown chevron. Each forwards `SVGAttributes`,
 * so `width`, `height`, and `fill` are overridable; the defaults below mirror
 * the values baked into each component.
 */
const meta = {
  title: "Webapp/Misc/Icons",
  component: SunIcon,
  parameters: { layout: "centered" },
  argTypes: {
    fill: { control: "color", table: { category: "Appearance" } },
    width: { control: "number", table: { category: "Size" } },
    height: { control: "number", table: { category: "Size" } },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof SunIcon>

export default meta
type Story = StoryObj<typeof meta>

const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex w-28 flex-col items-center gap-2 text-xs text-foreground">
    {children}
    <span>{label}</span>
  </div>
)

/** All icons at their default size and fill. */
export const Overview: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Cell label="SunIcon">
        <SunIcon />
      </Cell>
      <Cell label="MoonIcon">
        <MoonIcon />
      </Cell>
      <Cell label="KeyboardArrowDownIcon">
        <KeyboardArrowDownIcon />
      </Cell>
    </div>
  ),
}

/** The same icons rescaled and recolored via forwarded SVG attributes. */
export const SizesAndColors: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <SunIcon width={16} height={16} fill="#e8a857" />
      <SunIcon width={32} height={32} fill="#e8a857" />
      <MoonIcon width={32} height={32} fill="#6c8cff" />
      <KeyboardArrowDownIcon width={32} height={32} fill="#5cb47a" />
    </div>
  ),
}

/** Just the theme-toggle pair, the sun/moon used by the navbar switch. */
export const ThemeToggle: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SunIcon />
      <MoonIcon />
    </div>
  ),
}

/** Pinned dark to verify the light-fill icons read on a dark surface. */
export const Dark: Story = {
  globals: { theme: "dark" },
  render: Overview.render,
}
