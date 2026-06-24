import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  CalculatorIcon,
  CalendarIcon,
  CreditCardIcon,
  SettingsIcon,
  SmileIcon,
  UserIcon,
} from "lucide-react"
import * as React from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Button } from "./button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command"

/**
 * A composable command palette built on [`cmdk`](https://cmdk.paco.me). It
 * fuzzy-filters items as you type and is fully keyboard-driven (arrow keys to
 * move, Enter to select). `CommandDialog` composes the palette inside this
 * package's `Dialog` for the ⌘K overlay; `Command` on its own renders an
 * inline, embeddable palette. Powers the home-screen command menu.
 */
const meta = {
  title: "UI/Components/Command",
  component: Command,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Command>

export default meta

type Story = StoryObj<typeof meta>

function PaletteItems() {
  return (
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem>
          <CalendarIcon />
          Calendar
        </CommandItem>
        <CommandItem>
          <SmileIcon />
          Search Emoji
        </CommandItem>
        <CommandItem disabled>
          <CalculatorIcon />
          Calculator
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem>
          <UserIcon />
          Profile
          <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <CreditCardIcon />
          Billing
          <CommandShortcut>⌘B</CommandShortcut>
        </CommandItem>
        <CommandItem>
          <SettingsIcon />
          Settings
          <CommandShortcut>⌘S</CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  )
}

/**
 * An inline palette: search input, grouped items, separators, and shortcuts.
 */
export const Default: Story = {
  render: (args) => (
    <Command
      {...args}
      className="w-96 rounded-lg ring-1 ring-foreground/10 shadow-md"
    >
      <CommandInput placeholder="Type a command or search..." />
      <PaletteItems />
    </Command>
  ),
}

/**
 * The ⌘K overlay: `CommandDialog` composes the palette inside a `Dialog`.
 * Toggle with the button or press ⌘K / Ctrl+K.
 */
export const Dialog: Story = {
  render: () => {
    const Demo = () => {
      const [open, setOpen] = React.useState(false)

      React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
          if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            setOpen((value) => !value)
          }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
      }, [])

      return (
        <>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Open command menu
            <CommandShortcut>⌘K</CommandShortcut>
          </Button>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <PaletteItems />
          </CommandDialog>
        </>
      )
    }

    return <Demo />
  },
}

/**
 * The inline palette reviewed in dark mode.
 */
export const Dark: Story = {
  globals: {
    theme: "dark",
  },
  render: Default.render,
}

/**
 * Typing filters the visible options; a non-matching query shows the empty
 * state.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox")

    await step("a query narrows the options to a single match", async () => {
      await userEvent.type(input, "calen")
      await waitFor(() =>
        expect(
          canvas.getAllByRole("option", { name: /calendar/i })
        ).toHaveLength(1)
      )
    })

    await step("a broader query keeps multiple matches", async () => {
      await userEvent.clear(input)
      await userEvent.type(input, "se")
      await waitFor(() =>
        expect(canvas.getAllByRole("option").length).toBeGreaterThan(1)
      )
    })

    await step("a non-matching query shows the empty state", async () => {
      await userEvent.clear(input)
      await userEvent.type(input, "zzzz")
      await waitFor(() => expect(canvas.getByText(/no results/i)).toBeVisible())
    })
  },
}
