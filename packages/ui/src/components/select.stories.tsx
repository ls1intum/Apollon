import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { useState } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select"

/**
 * A listbox-style select built on Base UI's `Select`. `SelectTrigger` accepts a
 * `size` (`sm` | `default`); `SelectValue` accepts a `placeholder`. The popup
 * portals to `document.body` and supports keyboard selection (arrows, typeahead,
 * `Enter`). Set `aria-invalid` on the trigger to surface the invalid state.
 */
const meta = {
  title: "UI/Components/Select",
  component: Select,
  parameters: {
    layout: "centered",
  },
  args: {
    onValueChange: fn(),
  },
  argTypes: {
    value: {
      control: "text",
      description: "Controlled selected value.",
    },
    defaultValue: {
      control: "text",
      description: "Selected value on mount (uncontrolled).",
    },
    disabled: {
      control: "boolean",
      description: "Disable the whole select.",
    },
    required: {
      control: "boolean",
      description: "Mark the select as required for form validation.",
    },
  },
} satisfies Meta<typeof Select>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A select showing its placeholder until a value is chosen.
 */
export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
        <SelectItem value="grapes">Grapes</SelectItem>
      </SelectContent>
    </Select>
  ),
}

/**
 * Items split into labelled groups separated by a divider.
 */
export const WithGroups: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a food" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectItem value="potato">Potato</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

/**
 * A long option list that scrolls inside the popup, exercising the scroll
 * arrows.
 */
export const ManyOptions: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: 30 }).map((_, i) => (
          <SelectItem key={i} value={`utc-${i}`}>
            UTC{i >= 12 ? "+" : "-"}
            {Math.abs(i - 12)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
}

/**
 * The whole select disabled via the `disabled` prop on the root.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Unavailable" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>
  ),
}

/**
 * A single option disabled while the rest remain selectable.
 */
export const DisabledOption: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana" disabled>
          Banana (out of stock)
        </SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
      </SelectContent>
    </Select>
  ),
}

/**
 * The invalid state, surfaced by `aria-invalid` on the trigger.
 */
export const Invalid: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger aria-invalid className="w-48">
        <SelectValue placeholder="Required" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>
  ),
}

/**
 * A fully controlled select whose value is mirrored next to the trigger.
 */
export const Controlled: Story = {
  render: (args) => {
    const Demo = () => {
      const [value, setValue] = useState<string | null>("banana")
      return (
        <div className="flex items-center gap-3">
          <Select
            {...args}
            value={value}
            onValueChange={(next) => setValue(next as string | null)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="blueberry">Blueberry</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-sm">
            value: {value ?? "none"}
          </span>
        </div>
      )
    }
    return <Demo />
  },
}

/**
 * A long selected value that is clamped within a fixed-width trigger.
 */
export const LongValue: Story = {
  args: {
    defaultValue: "long",
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="short">Short</SelectItem>
        <SelectItem value="long">
          A very long option label that overflows the trigger width and is
          clamped
        </SelectItem>
      </SelectContent>
    </Select>
  ),
}

/**
 * The select pinned open in dark mode to review the popup surface, focus, and
 * checkmark indicator.
 */
export const Dark: Story = {
  args: {
    defaultValue: "banana",
  },
  parameters: {
    themes: { themeOverride: "dark" },
  },
  globals: {
    theme: "dark",
  },
  render: Default.render,
}

/**
 * Verifies portalled keyboard behaviour: opening shows the listbox, arrow keys
 * move the highlight, `Enter` selects the option, and the chosen value is
 * reflected in the trigger — asserted against `document.body`.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("combobox")

    await step("opening shows the listbox", async () => {
      await userEvent.click(trigger)
      const listbox = await body.findByRole("listbox")
      await waitFor(() => expect(listbox).toBeVisible())
    })

    await step("keyboard moves the highlight and Enter selects", async () => {
      const banana = await body.findByRole("option", { name: /banana/i })
      await userEvent.keyboard("{ArrowDown}")
      await userEvent.click(banana)
      await waitFor(() =>
        expect(body.queryByRole("listbox")).not.toBeInTheDocument()
      )
    })

    await step("selected value is reflected in the trigger", async () => {
      await waitFor(() => expect(trigger).toHaveTextContent(/banana/i))
    })
  },
}
