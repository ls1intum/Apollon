import type { Meta, StoryObj } from "@storybook/react-vite"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { BrandAndVersion } from "./BrandAndVersion"

/**
 * The Apollon logo + wordmark + app-version cluster shown at the left of the
 * navbar. The logo/wordmark is an indivisible, non-shrinking unit; the version
 * string is muted theme-independent white and hidden below the `sm` breakpoint.
 * The navbar is always dark, so the brand is previewed on a dark surface.
 */
const meta = {
  title: "Webapp/Navbar/BrandAndVersion",
  component: BrandAndVersion,
  parameters: { layout: "centered" },
  decorators: [DarkNavbarSurface],
  tags: ["autodocs"],
} satisfies Meta<typeof BrandAndVersion>

export default meta
type Story = StoryObj<typeof meta>

/** The brand cluster on the dark navbar surface. */
export const Default: Story = {}

/**
 * Narrow viewport: the version string collapses below `sm` while the
 * logo + wordmark stay intact (no truncation).
 */
export const NarrowViewport: Story = {
  parameters: {
    viewport: { defaultViewport: "mobile1" },
  },
}

/**
 * The navbar surface never changes color; the dark global is pinned here only
 * to confirm the brand stays identical regardless of theme.
 */
export const Dark: Story = {
  globals: { theme: "dark" },
}
