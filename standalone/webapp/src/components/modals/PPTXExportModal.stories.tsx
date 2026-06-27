import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { withModalFrame } from "../../stories/_support/webapp"
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
  parameters: {
    layout: "fullscreen",
    docs: { story: { inline: false, height: "720px" } },
  },
  decorators: [withModalFrame({ title: "Export as PPTX", variant: "plain" })],
} satisfies Meta<typeof PPTXExportModal>

export default meta
type Story = StoryObj<typeof meta>

/** The default export form with persisted (or default) settings. */
export const Default: Story = {}

/**
 * An out-of-range scale value surfaces the inline validation error, flips the
 * field to `aria-invalid`, and disables Export until it is corrected.
 */
export const InvalidScale: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ step }) => {
    const canvas = within(document.body)

    await step("enter an out-of-range scale", async () => {
      const scale = canvas.getByLabelText("Scale")
      await userEvent.clear(scale)
      await userEvent.type(scale, "9999")
    })

    await step(
      "the validation error appears and Export is blocked",
      async () => {
        await expect(
          await canvas.findByText(/enter a value from/i)
        ).toBeInTheDocument()
        await expect(canvas.getByLabelText("Scale")).toHaveAttribute(
          "aria-invalid",
          "true"
        )
        await expect(
          canvas.getByRole("button", { name: /^export$/i })
        ).toBeDisabled()
      }
    )

    await step(
      "a valid scale clears the error and re-enables Export",
      async () => {
        const scale = canvas.getByLabelText("Scale")
        await userEvent.clear(scale)
        await userEvent.type(scale, "120")
        await expect(canvas.getByText(/100% keeps the current/i)).toBeVisible()
        await expect(
          canvas.getByRole("button", { name: /^export$/i })
        ).toBeEnabled()
      }
    )
  },
}

/**
 * The file name is required: clearing it disables Export (an empty name can't
 * be the basis of an export file).
 */
export const FileNameRequired: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async () => {
    const canvas = within(document.body)
    const fileName = canvas.getByLabelText("File name")
    await userEvent.clear(fileName)
    await expect(
      canvas.getByRole("button", { name: /^export$/i })
    ).toBeDisabled()

    await userEvent.type(fileName, "architecture")
    await expect(
      canvas.getByRole("button", { name: /^export$/i })
    ).toBeEnabled()
  },
}
