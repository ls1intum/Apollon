import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { ModalBodyProviders } from "../../stories/_support/webapp"
import { PPTXExportModal } from "./PPTXExportModal"

/**
 * Body of the PPTX export modal. A settings form — file name, slide size,
 * scale, diagram fit, and font — that persists choices to localStorage and runs
 * the export only on submit. With no live editor mounted the file name defaults
 * to "diagram"; these stories render the form and exercise validation without
 * exporting.
 */
const meta = {
  title: "Webapp/Modals/PPTXExportModal",
  component: PPTXExportModal,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [ModalBodyProviders],
} satisfies Meta<typeof PPTXExportModal>

export default meta
type Story = StoryObj<typeof meta>

/** The default export form with persisted (or default) settings. */
export const Default: Story = {}

/** Pinned to dark mode to review the radio groups, inputs, and select. */
export const Dark: Story = {
  globals: { theme: "dark" },
}

/**
 * An out-of-range scale value surfaces the inline validation error and the
 * helper text switches accordingly.
 */
export const InvalidScale: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)

    await step("enter an out-of-range scale", async () => {
      const scale = canvas.getByLabelText("Scale")
      await userEvent.clear(scale)
      await userEvent.type(scale, "9999")
    })

    await step("the validation error appears", async () => {
      await expect(
        await canvas.findByText(/enter a value from/i)
      ).toBeInTheDocument()
    })
  },
}
