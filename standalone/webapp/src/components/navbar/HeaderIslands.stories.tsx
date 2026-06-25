import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { WebappProviders } from "../../stories/_support/webapp"
import { EditorHeaderRow } from "./HeaderIslands"

/**
 * The whole editor header as one fluid flex row: `[brand/back] [title] [actions]`.
 * Normally portaled into the library's `header` band by `EditorChromeHeader`;
 * here it is rendered inline against the dark editor backdrop so the glass
 * islands, the centred title field, and the actions cluster can be reviewed
 * directly.
 *
 * It reads `EditorContext` (the title island subscribes to the diagram name —
 * with no live editor it shows the "Untitled diagram" placeholder) and
 * `ModalContext` (Share/File open a modal), so `WebappProviders` wraps it. Links
 * use the global router from preview.tsx.
 */

const meta = {
  title: "Webapp/Navbar/EditorHeaderRow",
  component: EditorHeaderRow,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  decorators: [
    WebappProviders,
    (Story) => (
      // The header lives on the editor's THEME-FOLLOWING chrome surface (the
      // islands paint `.apollon-glass` from `--apollon-background`, text uses
      // `--apollon-chrome-text` — both flip with the theme). Render on that same
      // themed surface (not a fixed-dark plate) so the story reflects real
      // contrast and the islands lay out as shipped.
      <div className="bg-[var(--apollon-chrome-surface)] p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    isNarrow: false,
    hideBrand: false,
  },
  argTypes: {
    isNarrow: {
      control: "boolean",
      description:
        "Portrait-phone layout: collapse to compact pills + overflow menu.",
      table: { category: "Layout" },
    },
    hideBrand: {
      control: "boolean",
      description:
        "Hide the brand wordmark (native app / narrow) — left cluster is just Back.",
      table: { category: "Layout" },
    },
  },
} satisfies Meta<typeof EditorHeaderRow>

export default meta
type Story = StoryObj<typeof meta>

/** Desktop: brand + back, centred title field, full actions island. */
export const Default: Story = {}

/** Brand hidden (native app / tight width) — the left cluster is just Back. */
export const BrandHidden: Story = {
  args: { hideBrand: true },
}

/** Narrow phone layout: the back pill and the actions overflow pill. */
export const Narrow: Story = {
  args: { isNarrow: true },
}

/** The title field carries the placeholder and the actions are reachable. */
export const ActionsPresent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByPlaceholderText(/untitled diagram/i)
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: /share/i })
    ).toBeInTheDocument()
  },
}

/** Typing into the centred title field updates the input value. */
export const EditTitle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText<HTMLInputElement>(/diagram title/i)
    await userEvent.click(input)
    await userEvent.type(input, "Billing")
    await expect(input.value).toContain("Billing")
  },
}
