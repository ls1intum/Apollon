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
      <div className="flex gap-3 bg-[var(--navbar-bg)] p-4">
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
  },
  decorators: [
    (Story) => (
      <StubEditorContext>
        <div className="flex gap-3 bg-[var(--navbar-bg)] p-4">
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
