import type { Meta, StoryObj } from "@storybook/react-vite"
import { DarkNavbarSurface } from "../../stories/_support/webapp"
import { BrandLockup } from "./BrandLockup"

/**
 * The Apollon logo + wordmark + app-version cluster shown at the left of the
 * navbar. The logo/wordmark is an indivisible, non-shrinking unit; the version
 * string is muted theme-independent white and hidden below the `sm` breakpoint.
 * The navbar is a theme-following chrome surface, so the brand is previewed on
 * the matching themed chrome strip.
 */
const meta = {
  title: "Webapp/Navbar/BrandLockup",
  component: BrandLockup,
  parameters: { layout: "centered" },
  decorators: [DarkNavbarSurface],
  tags: ["autodocs"],
} satisfies Meta<typeof BrandLockup>

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
