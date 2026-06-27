import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import type * as React from "react"
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

type SelectStoryArgs = React.ComponentProps<typeof Select> & {
  /** Story-only: forwarded to `SelectTrigger`'s `size`. */
  triggerSize?: "sm" | "default"
}

/**
 * A listbox-style select built on Base UI's `Select`. `SelectTrigger` accepts a
 * `size` (`sm` | `default`); `SelectValue` accepts a `placeholder`. The popup
 * portals to `document.body` and supports keyboard selection (arrows, typeahead,
 * `Enter`). Set `aria-invalid` on the trigger to surface the invalid state.
 */
const meta = {
  title: "UI/Components/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    onValueChange: fn(),
    triggerSize: "default",
  },
  argTypes: {
    value: {
      control: "text",
      description: "Controlled selected value.",
      table: { category: "State" },
    },
    defaultValue: {
      control: "text",
      description: "Selected value on mount (uncontrolled).",
      table: { category: "State" },
    },
    disabled: {
      control: "boolean",
      description: "Disable the whole select.",
      table: { category: "State" },
    },
    required: {
      control: "boolean",
      description: "Mark the select as required for form validation.",
      table: { category: "State" },
    },
    onValueChange: {
      description: "Called with the newly selected value.",
      table: { category: "Events" },
    },
    triggerSize: {
      control: "select",
      options: ["sm", "default"],
      description:
        "`SelectTrigger` height: `sm` (h-7) or `default` (h-8). " +
        "Story-only arg forwarded to the trigger.",
      table: { category: "Appearance" },
    },
  },
} satisfies Meta<SelectStoryArgs>

export default meta

type Story = StoryObj<SelectStoryArgs>

/**
 * A select showing its placeholder until a value is chosen.
 */
export const Default: Story = {
  render: ({ triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger size={triggerSize} aria-label="Fruit" className="w-48">
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
 * The compact `sm` trigger (`size="sm"`, h-7) for dense toolbars and inline
 * controls.
 */
export const Small: Story = {
  args: {
    triggerSize: "sm",
    defaultValue: "apple",
  },
  render: Default.render,
}

/**
 * Items split into labelled groups separated by a divider.
 */
export const WithGroups: Story = {
  render: ({ triggerSize: _triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger aria-label="Food" className="w-48">
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
  render: ({ triggerSize: _triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger aria-label="Timezone" className="w-48">
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
  render: ({ triggerSize: _triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger aria-label="Disabled select" className="w-48">
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
  render: ({ triggerSize: _triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger aria-label="Fruit" className="w-48">
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
  render: ({ triggerSize: _triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger aria-invalid aria-label="Required field" className="w-48">
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
  render: ({ triggerSize: _triggerSize, ...args }) => {
    const Demo = () => {
      const [value, setValue] = useState<string | null>("banana")
      return (
        <div className="flex items-center gap-3">
          <Select
            {...args}
            value={value}
            onValueChange={(next) => setValue(next as string | null)}
          >
            <SelectTrigger aria-label="Fruit" className="w-48">
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
  render: ({ triggerSize: _triggerSize, ...args }) => (
    <Select {...args}>
      <SelectTrigger aria-label="Option" className="w-48">
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
  tags: ["!autodocs"],
  args: {
    defaultValue: "banana",
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

/**
 * Locks the accent highlight fix: the highlighted option must paint a different
 * background than the (white) popup surface, so the active row is visible.
 * Hovering an option highlights it (`focus:bg-accent`); we assert its computed
 * background differs from the popup's own background.
 */
export const HighlightContrast: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("combobox")

    await userEvent.click(trigger)
    await body.findByRole("listbox")
    const option = await body.findByRole("option", { name: /blueberry/i })
    const popup = canvasElement.ownerDocument.querySelector(
      '[data-slot="select-content"]'
    ) as HTMLElement

    await step(
      "highlighted option differs from the popup surface",
      async () => {
        await userEvent.hover(option)
        await waitFor(() => {
          const optionBg = getComputedStyle(option).backgroundColor
          const popupBg = getComputedStyle(popup).backgroundColor
          // The highlight must be a real, non-transparent fill...
          expect(optionBg).not.toBe("rgba(0, 0, 0, 0)")
          expect(optionBg).not.toBe("transparent")
          // ...and distinct from the menu's own (white) background.
          expect(optionBg).not.toBe(popupBg)
        })
      }
    )
  },
}
