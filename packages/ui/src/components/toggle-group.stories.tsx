import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from "lucide-react"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"

import { ToggleGroup, ToggleGroupItem } from "./toggle-group"

/**
 * A set of toggle buttons sharing state, built on Base UI's `ToggleGroup`. It is
 * single-select by default; pass `multiple` to allow several pressed items.
 * `variant`, `size`, `spacing`, and `orientation` propagate to every item via
 * context. Controlled through `value` / `onValueChange` (an array of pressed
 * item values).
 */
const meta = {
  title: "UI/Components/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    variant: "default",
    size: "default",
    spacing: 0,
    orientation: "horizontal",
    multiple: false,
    disabled: false,
    onValueChange: fn(),
  },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["default", "outline"],
      table: { category: "Appearance" },
    },
    size: {
      control: "inline-radio",
      options: ["sm", "default", "lg"],
      table: { category: "Appearance" },
    },
    spacing: {
      control: { type: "number", min: 0, max: 8 },
      description: "Gap (px) between items; 0 fuses them into a segmented bar.",
      table: { category: "Appearance" },
    },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
      table: { category: "Appearance" },
    },
    multiple: {
      control: "boolean",
      description: "Allow more than one item to be pressed at once.",
      table: { category: "Behavior" },
    },
    disabled: {
      control: "boolean",
      table: { category: "State" },
    },
    onValueChange: {
      description: "Called with the array of pressed item values.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof ToggleGroup>

export default meta

type Story = StoryObj<typeof meta>

const alignItems = (
  <>
    <ToggleGroupItem value="left" aria-label="Align left">
      <AlignLeftIcon />
    </ToggleGroupItem>
    <ToggleGroupItem value="center" aria-label="Align center">
      <AlignCenterIcon />
    </ToggleGroupItem>
    <ToggleGroupItem value="right" aria-label="Align right">
      <AlignRightIcon />
    </ToggleGroupItem>
    <ToggleGroupItem value="justify" aria-label="Justify">
      <AlignJustifyIcon />
    </ToggleGroupItem>
  </>
)

/** A single-select segmented group (default `spacing={0}`). */
export const Default: Story = {
  args: { defaultValue: ["center"] },
  render: (args) => <ToggleGroup {...args}>{alignItems}</ToggleGroup>,
}

/** The `outline` variant draws a shared border around the segmented group. */
export const Outline: Story = {
  args: { variant: "outline", defaultValue: ["left"] },
  render: (args) => <ToggleGroup {...args}>{alignItems}</ToggleGroup>,
}

/** `multiple` lets several items stay pressed at once (text formatting). */
export const Multiple: Story = {
  args: { multiple: true, variant: "outline", defaultValue: ["bold"] },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** Non-zero `spacing` separates the items into individual pills. */
export const Spaced: Story = {
  args: { variant: "outline", spacing: 4, defaultValue: ["center"] },
  render: (args) => <ToggleGroup {...args}>{alignItems}</ToggleGroup>,
}

/** A vertical group. */
export const Vertical: Story = {
  args: { variant: "outline", orientation: "vertical", defaultValue: ["left"] },
  render: (args) => <ToggleGroup {...args}>{alignItems}</ToggleGroup>,
}

/** The whole group disabled. */
export const Disabled: Story = {
  args: { variant: "outline", disabled: true, defaultValue: ["center"] },
  render: (args) => <ToggleGroup {...args}>{alignItems}</ToggleGroup>,
}

/** A fully controlled group mirroring its value next to the control. */
export const Controlled: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState<string[]>(["center"])
      return (
        <div className="flex items-center gap-3">
          <ToggleGroup
            {...args}
            variant="outline"
            value={value}
            onValueChange={setValue}
          >
            {alignItems}
          </ToggleGroup>
          <span className="text-muted-foreground text-sm">
            value: {value.join(", ") || "none"}
          </span>
        </div>
      )
    }
    return <Demo />
  },
}

/** Every variant across every size and both spacings for visual review. */
export const Matrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: () => {
    const variants = ["default", "outline"] as const
    const sizes = ["sm", "default", "lg"] as const
    const spacings = [0, 4] as const
    return (
      <div className="flex flex-col gap-6">
        {spacings.map((spacing) => (
          <div key={spacing} className="flex flex-col gap-3">
            <span className="text-muted-foreground text-sm">
              spacing: {spacing}
            </span>
            {variants.map((variant) => (
              <div key={variant} className="flex items-center gap-4">
                {sizes.map((size) => (
                  <ToggleGroup
                    key={size}
                    variant={variant}
                    size={size}
                    spacing={spacing}
                    defaultValue={["center"]}
                  >
                    {alignItems}
                  </ToggleGroup>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  },
}

/** Pinned dark-theme review across variants and spacing. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-4">
      <ToggleGroup defaultValue={["center"]}>{alignItems}</ToggleGroup>
      <ToggleGroup variant="outline" defaultValue={["left"]}>
        {alignItems}
      </ToggleGroup>
      <ToggleGroup variant="outline" spacing={4} defaultValue={["right"]}>
        {alignItems}
      </ToggleGroup>
    </div>
  ),
}

/** Interaction test: single-select swaps the pressed item. */
export const SelectInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: { defaultValue: ["left"] },
  render: (args) => <ToggleGroup {...args}>{alignItems}</ToggleGroup>,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const left = canvas.getByRole("button", { name: /align left/i })
    const right = canvas.getByRole("button", { name: /align right/i })

    await expect(left).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(right)
    await expect(right).toHaveAttribute("aria-pressed", "true")
    await expect(left).toHaveAttribute("aria-pressed", "false")
    await expect(args.onValueChange).toHaveBeenCalledWith(
      ["right"],
      expect.anything()
    )
  },
}
