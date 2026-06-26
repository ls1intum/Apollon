import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { expect, fn, userEvent } from "storybook/test"
import { JsonFileImportButtonView } from "./JsonFileImportButton"

/**
 * Pure "Import" menu entry. It opens a hidden native file picker and reports the
 * chosen `File` via `onFile` (then `onClose`) — it does no parsing, persistence,
 * or navigation. Rendered here inside an open dropdown so the menu item shows.
 */
const meta = {
  title: "Webapp/Navbar/JsonFileImportButton",
  component: JsonFileImportButtonView,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    onFile: fn(),
    onClose: fn(),
  },
  argTypes: {
    onFile: {
      description: "Fired with the chosen file from the native picker.",
      table: { category: "Events" },
    },
    onClose: {
      description:
        "Fired to close the surrounding menu after a file is chosen.",
      table: { category: "Events" },
    },
  },
  decorators: [
    (Story) => (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>File</DropdownMenuTrigger>
        <DropdownMenuContent>
          <Story />
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  ],
} satisfies Meta<typeof JsonFileImportButtonView>

export default meta
type Story = StoryObj<typeof meta>

/** The Import entry sits inside the open File menu. */
export const Default: Story = {}

/** Choosing a file reports it to the caller and closes the menu. */
export const ChoosesFile: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args }) => {
    // The picker is a hidden, unlabeled <input type="file"> the menu item opens.
    // The menu content portals to the document body, so query there.
    const input =
      document.body.querySelector<HTMLInputElement>("input[type=file]")
    await expect(input).not.toBeNull()

    const file = new File(['{"version":"3.0.0"}'], "diagram.json", {
      type: "application/json",
    })
    await userEvent.upload(input!, file)

    await expect(args.onFile).toHaveBeenCalledWith(file)
    await expect(args.onClose).toHaveBeenCalled()
  },
}
