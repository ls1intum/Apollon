import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import {
  StubEditorContext,
  WebappProviders,
} from "../../stories/_support/webapp"
import { MobileActionsPill, MobileBackPill } from "./MobileIslands"

/**
 * The compact phone-portrait chrome pills. `MobileBackPill` is the left
 * cluster — an always-visible chevron-only back affordance, the single
 * `<header role="banner">`. `MobileActionsPill` is the right cluster — a true
 * overflow bar that keeps Share + Version history as direct icons and collapses
 * File / Save copy / Help / theme behind a "…" menu.
 *
 * Both read `ModalContext` (Share opens a modal) so `WebappProviders` wraps
 * them; they paint on the editor's dark canvas, so the decorator supplies that
 * backdrop. The overflow menu portals to the document body.
 */

const meta = {
  title: "Webapp/Navbar/MobileIslands",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    WebappProviders,
    (Story) => (
      // Theme-following chrome surface — the pills paint themed glass + use
      // `--apollon-chrome-text`, so a fixed-dark plate would misreport contrast.
      <div className="bg-[var(--apollon-chrome-surface)] flex gap-3 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

/** The back pill beside the actions pill, as they sit on a phone. */
export const Default: Story = {
  render: () => (
    <>
      <MobileBackPill />
      <MobileActionsPill />
    </>
  ),
}

/** The left back cluster in isolation. */
export const BackPill: Story = {
  render: () => <MobileBackPill />,
}

/** The right overflow cluster in isolation (Share + Version + "…"). */
export const ActionsPill: Story = {
  render: () => <MobileActionsPill />,
}

/**
 * The "Save a local copy" tail item only renders with BOTH a /shared/:id route
 * and a live editor in context, so this story drives the router there and
 * injects a minimal editor stub (the same stub the SaveLocalCopyButton stories
 * use) so the collapsed tail is fully populated.
 */
export const OverflowMenu: Story = {
  render: () => <MobileActionsPill />,
  // "Save a local copy" only renders on a /shared/:id route with a live editor.
  parameters: {
    tanstackRouter: {
      initialEntry: "/shared/demo-diagram",
      routePaths: ["/shared/$id"],
    },
    a11y: {
      // The overflow menu is a base-ui `role="menu"` with a roving-tabindex: its
      // rows are reachable by arrow keys, not by Tab, and the container carries
      // `tabindex="-1"`. When the full flat tail (File leaves + Export group +
      // Save + Help + legal + Theme) exceeds the tiny centred story plate the menu
      // scrolls, and axe's `scrollable-region-focusable` flags the container for
      // not being Tab-focusable — a known false positive for menus, whose keyboard
      // access is the menuitem roving focus axe doesn't model. In production the
      // phone-height menu doesn't scroll at this row count. The composition is
      // exactly what ships; the rule is disabled for this story's intent only.
      options: {
        rules: { "scrollable-region-focusable": { enabled: false } },
      },
    },
  },
  decorators: [
    (Story) => (
      <StubEditorContext>
        <div className="bg-[var(--apollon-chrome-surface)] flex gap-3 p-4">
          <Story />
        </div>
      </StubEditorContext>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /open options/i }))
    const menu = within(canvasElement.ownerDocument.body)
    await expect(
      await menu.findByText(/save a local copy/i)
    ).toBeInTheDocument()
  },
}
