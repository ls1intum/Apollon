import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { useState } from "react"

import { Button } from "./button"
import { Field, FieldLabel } from "./field"
import { Input } from "./input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover"

/**
 * A non-modal floating panel anchored to a trigger, built on Base UI's
 * `Popover`. `PopoverContent` exposes positioner props (`side`, `sideOffset`,
 * `align`, `alignOffset`). It portals to `document.body`, closes on `Escape` or
 * outside click, and returns focus to the trigger on close.
 */
const meta = {
  title: "UI/Components/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  args: {
    onOpenChange: fn(),
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "Controlled open state.",
      table: { category: "State" },
    },
    defaultOpen: {
      control: "boolean",
      description: "Open state on mount (uncontrolled).",
      table: { category: "State" },
    },
    modal: {
      control: "boolean",
      description:
        "Whether the popover blocks interaction with the rest of the page.",
      table: { category: "State" },
    },
    onOpenChange: {
      description: "Called with the next open state when it changes.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<typeof Popover>

export default meta

type Story = StoryObj<typeof meta>

const sides = ["top", "right", "bottom", "left"] as const

/**
 * The default popover opened from a trigger.
 */
export const Default: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open popover
      </PopoverTrigger>
      <PopoverContent>
        <p>Place any content inside the popover.</p>
      </PopoverContent>
    </Popover>
  ),
}

/**
 * A popover using `PopoverHeader`, `PopoverTitle`, and `PopoverDescription`.
 */
export const WithHeader: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Dimensions
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>
            Set the dimensions for the layer.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
}

/**
 * A popover pinned open on mount via the uncontrolled `defaultOpen` arg.
 */
export const Open: Story = {
  args: {
    defaultOpen: true,
  },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open popover
      </PopoverTrigger>
      <PopoverContent aria-label="Open popover">
        <p>This popover is open by default.</p>
      </PopoverContent>
    </Popover>
  ),
}

/**
 * A genuinely controlled popover: local React state drives `open` and is kept
 * in sync through `onOpenChange`, and an external button toggles it from
 * outside the `Popover`.
 */
export const Controlled: Story = {
  render: (args) => {
    const Demo = () => {
      const [open, setOpen] = useState(false)
      return (
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setOpen((o) => !o)}>
            Toggle externally
          </Button>
          <Popover
            {...args}
            open={open}
            onOpenChange={(next, details) => {
              setOpen(next)
              args.onOpenChange?.(next, details)
            }}
          >
            <PopoverTrigger render={<Button variant="outline" />}>
              Anchor
            </PopoverTrigger>
            <PopoverContent aria-label="Controlled popover">
              <p>Driven by external React state.</p>
            </PopoverContent>
          </Popover>
        </div>
      )
    }
    return <Demo />
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const toggle = canvas.getByRole("button", { name: /toggle externally/i })

    await step("external button opens the popover", async () => {
      await userEvent.click(toggle)
      await waitFor(() =>
        expect(body.getByText(/driven by external react state/i)).toBeVisible()
      )
    })

    await step("Escape closes the controlled popover", async () => {
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(
          body.queryByText(/driven by external react state/i)
        ).not.toBeInTheDocument()
      )
    })

    await step(
      "external button re-opens it (state is the source of truth)",
      async () => {
        await userEvent.click(toggle)
        await waitFor(() =>
          expect(
            body.getByText(/driven by external react state/i)
          ).toBeVisible()
        )
      }
    )
  },
}

/**
 * One trigger per `side` value to review placement in light and dark.
 */
export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {sides.map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="outline" />}>
            {side}
          </PopoverTrigger>
          <PopoverContent side={side} className="w-auto">
            <p className="capitalize">Opens on the {side}.</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
}

/**
 * A popover containing a small form.
 */
export const WithForm: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Edit dimensions
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>
            Set the dimensions for the layer.
          </PopoverDescription>
        </PopoverHeader>
        <Field>
          <FieldLabel>Width</FieldLabel>
          <Input defaultValue="100%" />
        </Field>
        <Field>
          <FieldLabel>Height</FieldLabel>
          <Input defaultValue="25px" />
        </Field>
      </PopoverContent>
    </Popover>
  ),
}

/**
 * The popover pinned open in dark mode to review surface, ring, and text.
 */
export const Dark: Story = {
  tags: ["!autodocs"],
  args: {
    defaultOpen: true,
  },
  globals: {
    theme: "dark",
  },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open popover
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Reviewing dark-mode contrast.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
}

/**
 * Verifies portalled behaviour: clicking opens the popup, `Escape` closes it,
 * an outside click closes it, and focus returns to the trigger — asserted
 * against `document.body`.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("button", { name: /open popover/i })

    await step("click opens the popover", async () => {
      await userEvent.click(trigger)
      await waitFor(() =>
        expect(body.getByText(/place any content/i)).toBeVisible()
      )
    })

    await step("Escape closes and returns focus to the trigger", async () => {
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(body.queryByText(/place any content/i)).not.toBeInTheDocument()
      )
      expect(trigger).toHaveFocus()
    })

    await step("outside click closes the popover", async () => {
      await userEvent.click(trigger)
      await body.findByText(/place any content/i)
      await userEvent.click(canvasElement.ownerDocument.body)
      await waitFor(() =>
        expect(body.queryByText(/place any content/i)).not.toBeInTheDocument()
      )
    })
  },
}
