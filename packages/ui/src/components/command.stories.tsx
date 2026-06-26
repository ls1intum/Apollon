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
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

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

type CommandStoryArgs = React.ComponentProps<typeof Command> & {
  /** Story-only: wired onto each `CommandItem` so selection is observable. */
  onSelect?: (value: string) => void
}

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
  args: {
    onValueChange: fn(),
  },
  argTypes: {
    value: {
      control: "text",
      description: "Controlled value of the active (highlighted) item.",
      table: { category: "State" },
    },
    onValueChange: {
      description:
        "Called with the value of the active item as the highlight moves.",
      table: { category: "Events" },
    },
    shouldFilter: {
      control: "boolean",
      description:
        "Whether cmdk filters and sorts items as you type. Disable to filter " +
        "server-side and render the results yourself.",
      table: { category: "Data" },
    },
    loop: {
      control: "boolean",
      description:
        "Whether arrow-key navigation wraps around at the list boundaries.",
      table: { category: "Appearance" },
    },
    onSelect: {
      control: false,
      description:
        "Story-only: wired onto each `CommandItem`; called with the selected " +
        "item's value on Enter or click.",
      table: { category: "Events" },
    },
  },
} satisfies Meta<CommandStoryArgs>

export default meta

type Story = StoryObj<CommandStoryArgs>

function PaletteItems({
  onSelect,
}: {
  onSelect?: (value: string) => void
} = {}) {
  return (
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem onSelect={onSelect}>
          <CalendarIcon />
          Calendar
        </CommandItem>
        <CommandItem onSelect={onSelect}>
          <SmileIcon />
          Search Emoji
        </CommandItem>
        <CommandItem disabled onSelect={onSelect}>
          <CalculatorIcon />
          Calculator
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Settings">
        <CommandItem onSelect={onSelect}>
          <UserIcon />
          Profile
          <CommandShortcut>⌘P</CommandShortcut>
        </CommandItem>
        <CommandItem onSelect={onSelect}>
          <CreditCardIcon />
          Billing
          <CommandShortcut>⌘B</CommandShortcut>
        </CommandItem>
        <CommandItem onSelect={onSelect}>
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
  render: ({ onSelect, ...args }) => (
    <Command
      {...args}
      className="w-96 rounded-lg ring-1 ring-foreground/10 shadow-md"
    >
      <CommandInput placeholder="Type a command or search..." />
      <PaletteItems onSelect={onSelect} />
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
 * The empty state: when the query matches nothing, `CommandEmpty` renders in
 * place of the option list. Shown here with a non-matching controlled query.
 */
export const Empty: Story = {
  parameters: {
    a11y: {
      // With no matching options the `role="listbox"` holds only the empty-state
      // text and zero `option` children — axe's aria-required-children flags the
      // empty listbox. That empty result set is the exact state under test.
      options: { rules: { "aria-required-children": { enabled: false } } },
    },
  },
  render: ({ onSelect: _onSelect, ...args }) => (
    <Command
      {...args}
      className="w-96 rounded-lg ring-1 ring-foreground/10 shadow-md"
    >
      <CommandInput
        value="no such command"
        onValueChange={() => {}}
        placeholder="Type a command or search..."
      />
      <PaletteItems />
    </Command>
  ),
}

/**
 * The inline palette reviewed in dark mode.
 */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: {
    theme: "dark",
  },
  render: Default.render,
}

/**
 * Typing filters the visible options, a non-matching query shows the empty
 * state, and ArrowDown + Enter selects the highlighted item.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: {
    onSelect: fn(),
  },
  parameters: {
    a11y: {
      // This test types a non-matching query, so cmdk's `role="listbox"` ends up
      // with only the "no results" empty state and zero `option` children — axe's
      // aria-required-children flags the momentarily-empty listbox. That empty
      // result set is the exact state under test, not a markup defect.
      options: { rules: { "aria-required-children": { enabled: false } } },
    },
  },
  render: Default.render,
  play: async ({ args, canvasElement, step }) => {
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

    await step(
      "ArrowDown then Enter selects the highlighted item",
      async () => {
        await userEvent.clear(input)
        await userEvent.type(input, "calen")
        await waitFor(() =>
          expect(
            canvas.getByRole("option", { name: /calendar/i })
          ).toBeVisible()
        )
        await userEvent.keyboard("{Enter}")
        await waitFor(() =>
          expect(args.onSelect).toHaveBeenCalledWith(
            expect.stringMatching(/calendar/i)
          )
        )
      }
    )
  },
}
