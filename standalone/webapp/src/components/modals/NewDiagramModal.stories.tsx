import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
import { NewDiagramModal } from "./NewDiagramModal"

/**
 * The "New diagram" modal, in its real chrome (the wide home dialog with the
 * accent header). Two tabs — a blank diagram (pick a type) and a template (pick
 * a design pattern) — plus a name field. The store is only written and
 * navigation only happens on confirm; these stories render the form and exercise
 * field entry / tab switching without submitting.
 */
const meta = {
  title: "Webapp/Modals/NewDiagramModal",
  component: NewDiagramModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" } },
  },
  decorators: [withModalFrame({ title: "New Diagram", variant: "home-wide" })],
} satisfies Meta<typeof NewDiagramModal>

export default meta
type Story = StoryObj<typeof meta>

/** Default view: the "Blank diagram" tab with the diagram-type picker. */
export const Default: Story = {}

/**
 * Switching to the template tab swaps the structural/behavioral/creational
 * pattern pickers in, and editing the name field stops it tracking the default.
 */
export const TemplateTabAndRename: Story = {
  play: async ({ step }) => {
    // The modal portals over a backdrop, so query the whole document.
    const screen = within(document.body)

    await step("switch to the template tab", async () => {
      await userEvent.click(screen.getByRole("tab", { name: /use template/i }))
      const headings = await screen.findAllByRole("heading", {
        name: /creational/i,
      })
      await expect(headings.length).toBeGreaterThan(0)
    })

    await step("rename the diagram", async () => {
      const name = screen.getByLabelText("Name")
      await userEvent.clear(name)
      await userEvent.type(name, "My Pattern Diagram")
      await expect(name).toHaveValue("My Pattern Diagram")
    })
  },
}
