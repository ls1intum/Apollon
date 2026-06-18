import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { reactRouterParameters } from "storybook-addon-remix-react-router"
import { useVersionStore } from "@/stores/useVersionStore"
import { WebappProviders } from "../../stories/_support/webapp"
import { VersionHistoryButton } from "./VersionHistoryButton"

const DIAGRAM_ID = "shared-demo-1"

/**
 * Navbar entry point for the version-history drawer. It renders ONLY on a
 * shared/connected route (`/shared/:id`) where the drawer is mounted; on local
 * or top-level routes it returns `null`. Clicking toggles the per-diagram
 * `drawerOpenByDiagram` flag in the version store.
 */
const meta = {
  title: "Webapp/Navbar/VersionHistoryButton",
  component: VersionHistoryButton,
  tags: ["autodocs"],
  decorators: [
    WebappProviders,
    (Story) => (
      <div style={{ background: "var(--navbar-bg)", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
    reactRouter: reactRouterParameters({
      location: { path: `/shared/${DIAGRAM_ID}` },
      routing: { path: "/shared/:diagramId" },
    }),
  },
  beforeEach: () => {
    useVersionStore.setState({ drawerOpenByDiagram: {} })
  },
} satisfies Meta<typeof VersionHistoryButton>

export default meta
type Story = StoryObj<typeof meta>

/** Visible on a shared route, drawer closed. */
export const Default: Story = {}

/** Drawer pre-opened — the button reflects the pressed state. */
export const DrawerOpen: Story = {
  beforeEach: () => {
    useVersionStore.setState({
      drawerOpenByDiagram: { [DIAGRAM_ID]: true },
    })
  },
}

/** Pinned dark-theme review. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/** Clicking the button toggles the drawer-open flag in the store. */
export const TogglesDrawer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /version history/i })
    await expect(button).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(button)
    await expect(
      useVersionStore.getState().drawerOpenByDiagram[DIAGRAM_ID]
    ).toBe(true)
  },
}
