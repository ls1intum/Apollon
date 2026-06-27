import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { HeaderTitleField } from "./HeaderTitleField"

/**
 * The pure diagram-title field extracted out of the editor header — props in,
 * `onValueChange` out, no editor/store wiring. It renders the borderless
 * on-glass capsule (`.apollon-chrome-title-island`), so it paints from the
 * single-sourced chrome tokens with NO providers mounted; the container
 * `HeaderTitleIsland` pairs it with `useDiagramTitle`.
 */
const meta = {
  title: "Webapp/Navbar/HeaderTitleField",
  component: HeaderTitleField,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div
        className="bg-[var(--apollon-chrome-surface)] p-3"
        style={{ width: 360 }}
      >
        <Story />
      </div>
    ),
  ],
  args: { value: "Billing context", onValueChange: fn() },
  argTypes: {
    value: { control: "text", table: { category: "Data" } },
    onValueChange: { table: { category: "Events" } },
    placeholder: { control: "text", table: { category: "Data" } },
  },
} satisfies Meta<typeof HeaderTitleField>

export default meta
type Story = StoryObj<typeof meta>

/** A named diagram — the field sizes to its text. */
export const Default: Story = {}

/** Empty value falls back to the placeholder (and its width). */
export const Empty: Story = {
  args: { value: "" },
}

/**
 * Controlled wrapper so the field reflects typed input in the interaction test
 * (a real container would feed `value` back from the editor store).
 */
function ControlledTitleField({
  value: initial,
  onValueChange,
  placeholder,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <HeaderTitleField
      value={value}
      placeholder={placeholder}
      onValueChange={(next) => {
        onValueChange(next)
        setValue(next)
      }}
    />
  )
}

/** Typing reports each keystroke through `onValueChange`. */
export const Typing: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: (args) => <ControlledTitleField {...args} />,
  play: async ({ args, canvasElement }) => {
    const input =
      within(canvasElement).getByLabelText<HTMLInputElement>(/diagram title/i)
    await userEvent.clear(input)
    await userEvent.type(input, "Orders")
    await expect(input.value).toBe("Orders")
    await expect(args.onValueChange).toHaveBeenLastCalledWith("Orders")
  },
}
