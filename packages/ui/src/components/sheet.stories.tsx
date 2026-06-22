import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "./button"
import { Field, FieldLabel } from "./field"
import { Input } from "./input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet"

/**
 * A slide-in panel built on Base UI's `Dialog`, anchored to one edge of the
 * viewport. `SheetContent` accepts a `side` (`top` | `right` | `bottom` |
 * `left`, default `right`) and `showCloseButton` (default `true`). It portals
 * to `document.body`, traps focus, and closes on `Escape`, backdrop click, or
 * any `SheetClose`.
 */
const meta = {
  title: "UI/Components/Sheet",
  component: Sheet,
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
    },
    defaultOpen: {
      control: "boolean",
      description: "Open state on mount (uncontrolled).",
    },
    modal: {
      control: "boolean",
      description:
        "Whether the sheet blocks interaction with the rest of the page.",
    },
  },
} satisfies Meta<typeof Sheet>

export default meta

type Story = StoryObj<typeof meta>

const sides = ["right", "left", "top", "bottom"] as const

/**
 * The default right-aligned sheet opened from a trigger.
 */
export const Default: Story = {
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>
        Open sheet
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here. Click save when you are done.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button />}>Save changes</SheetClose>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

/**
 * One trigger per edge so every `side` value can be reviewed in light and dark.
 */
export const SidesMatrix: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <div className="flex flex-wrap gap-2">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger render={<Button variant="outline" />}>
            {side}
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle className="capitalize">{side} sheet</SheetTitle>
              <SheetDescription>
                This panel slides in from the {side} edge.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose render={<Button variant="outline" />}>
                Close
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
}

/**
 * A sheet containing a form. Submitting closes the sheet via `SheetClose`.
 */
export const WithForm: Story = {
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>
        Edit profile
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Update your details and save your changes.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input defaultValue="Ada Lovelace" />
          </Field>
          <Field>
            <FieldLabel>Username</FieldLabel>
            <Input defaultValue="@ada" />
          </Field>
        </div>
        <SheetFooter>
          <SheetClose render={<Button />}>Save changes</SheetClose>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

/**
 * A footer with stacked actions, demonstrating the `mt-auto` footer placement.
 */
export const WithFooter: Story = {
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Manage how you receive notifications.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button />}>Save preferences</SheetClose>
          <SheetClose render={<Button variant="ghost" />}>Dismiss</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

/**
 * A sheet rendered open on mount.
 */
export const Open: Story = {
  args: {
    defaultOpen: true,
  },
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>
        Open sheet
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>This sheet is open by default.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

/**
 * The sheet pinned open in dark mode to review the overlay, border, and footer.
 */
export const Dark: Story = {
  args: {
    defaultOpen: true,
  },
  globals: {
    theme: "dark",
  },
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>
        Open sheet
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Reviewing dark-mode contrast.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

/**
 * Verifies portalled behaviour: opening sets `data-open`, a `SheetClose` action
 * closes the panel, and `Escape` closes it — all asserted against
 * `document.body`.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)

    await step("opening sets data-open", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /open sheet/i })
      )
      const sheet = await body.findByRole("dialog")
      await waitFor(() => expect(sheet).toHaveAttribute("data-open"))
    })

    await step("SheetClose closes the sheet", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /cancel/i })
      )
      await waitFor(() =>
        expect(body.queryByRole("dialog")).not.toBeInTheDocument()
      )
    })

    await step("Escape closes the sheet", async () => {
      await userEvent.click(
        await body.findByRole("button", { name: /open sheet/i })
      )
      await body.findByRole("dialog")
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(body.queryByRole("dialog")).not.toBeInTheDocument()
      )
    })
  },
}
