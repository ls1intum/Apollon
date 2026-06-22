import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { NewDiagramModal } from "./NewDiagramModal"

/**
 * Body of the "New diagram" modal. Two tabs — a blank diagram (pick a type) and
 * a template (pick a design pattern) — plus a name field. The store is only
 * written and navigation only happens when the user confirms; these stories
 * render the form and exercise field entry / tab switching without submitting.
 */
const meta = {
  title: "Webapp/Modals/NewDiagramModal",
  component: NewDiagramModal,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [ModalBodyProviders],
} satisfies Meta<typeof NewDiagramModal>

export default meta
type Story = StoryObj<typeof meta>

/** Default view: the "Blank diagram" tab with the diagram-type picker. */
export const Default: Story = {}

/** Pinned to dark mode to review the option-grid and tab contrast. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/**
 * Switching to the template tab swaps the structural/behavioral/creational
 * pattern pickers in, and editing the name field stops it tracking the default.
 */
export const TemplateTabAndRename: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step("switch to the template tab", async () => {
      await userEvent.click(canvas.getByRole("tab", { name: /use template/i }))
      const headings = await canvas.findAllByRole("heading", {
        name: /creational/i,
      })
      await expect(headings.length).toBeGreaterThan(0)
    })

    await step("rename the diagram", async () => {
      const name = canvas.getByLabelText("Name")
      await userEvent.clear(name)
      await userEvent.type(name, "My Pattern Diagram")
      await expect(name).toHaveValue("My Pattern Diagram")
    })
  },
}
