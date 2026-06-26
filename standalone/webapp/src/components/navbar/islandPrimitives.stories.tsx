import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { Settings2Icon } from "lucide-react"
import { Island, GroupDivider, IslandInput } from "./islandPrimitives"

/**
 * Shared island primitives, rendered with NO editor mounted — this is exactly the
 * webapp-HOME case the chrome-token single-sourcing exists for. The
 * `.apollon-glass` surface, the chrome dimensional tokens, and the
 * `.apollon-chrome-iconbtn` idiom all resolve from @tumaet/ui (tokens.css +
 * components.css, which the webapp imports app-wide), so the band paints
 * correctly without the editor's app.css.
 *
 * Use the toolbar theme toggle to confirm the glass surface, border, shadow, and
 * text flip correctly in light + dark.
 */
const meta = {
  title: "Webapp/Navbar/Island Primitives",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/**
 * A bare `.apollon-glass` plate on the themed page background — the minimal proof
 * that the home gets the floating-glass surface with no editor mounted.
 */
export const GlassSurface: Story = {
  render: () => (
    <div
      data-testid="glass-probe"
      className="apollon-glass"
      style={{
        display: "flex",
        height: "var(--apollon-chrome-island-h)",
        alignItems: "center",
        padding: "0 16px",
        color: "var(--apollon-chrome-text)",
        fontWeight: 600,
      }}
    >
      .apollon-glass
    </div>
  ),
  play: async ({ canvasElement }) => {
    const probe = within(canvasElement).getByTestId("glass-probe")
    // The glass surface comes from the class, not inline styles — assert the
    // browser actually resolved a non-empty backdrop-filter + border from the
    // single-sourced chrome tokens (i.e. components.css reached the home).
    const cs = getComputedStyle(probe)
    // `-webkit-backdrop-filter` via getPropertyValue: the camelCase
    // `webkitBackdropFilter` isn't on the TS `CSSStyleDeclaration` type.
    await expect(
      cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter")
    ).not.toBe("none")
    await expect(cs.borderTopWidth).toBe("1px")
  },
}

/**
 * The island grammar end to end: an `Island` laying out an `IslandInput`
 * (borderless-on-glass), a `GroupDivider`, and an `.apollon-chrome-iconbtn` —
 * the exact pieces the home band will compose, with no editor in sight.
 */
export const IslandBand: Story = {
  render: () => (
    // A bounded width so the centered preview gives the flex children real space
    // (mirrors the header track the editor portals the islands into).
    <div style={{ width: 360 }}>
      <Island ariaLabel="Demo island">
        <IslandInput
          placeholder="Search diagrams"
          aria-label="Search"
          style={{ flex: "1 1 auto", maxWidth: "min(560px, 100%)" }}
        />
        <GroupDivider />
        <button
          type="button"
          className="apollon-chrome-iconbtn"
          aria-label="Settings"
          title="Settings"
        >
          <Settings2Icon className="size-4" aria-hidden />
        </button>
      </Island>
    </div>
  ),
}
