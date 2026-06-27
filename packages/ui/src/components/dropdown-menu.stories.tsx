import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { useState } from "react"

import { Button } from "./button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu"

/**
 * A menu built on Base UI's `Menu`. Items support keyboard navigation
 * (arrows, typeahead), `Enter`/`Space` to invoke, and `Escape` to close.
 * `DropdownMenuItem` accepts `variant` (`default` | `destructive`) and `inset`.
 * The popup portals to `document.body`.
 */
const meta = {
  title: "UI/Components/DropdownMenu",
  component: DropdownMenu,
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
        "Whether the menu blocks interaction with the rest of the page.",
    },
  },
} satisfies Meta<typeof DropdownMenu>

export default meta

type Story = StoryObj<typeof meta>

/**
 * A basic menu of actions.
 */
export const Default: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open menu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/**
 * Items organised into labelled groups.
 */
export const WithGroupsAndLabels: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Account
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Team</DropdownMenuLabel>
          <DropdownMenuItem>Invite users</DropdownMenuItem>
          <DropdownMenuItem>New team</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/**
 * Groups divided by separators.
 */
export const WithSeparators: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open menu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Back</DropdownMenuItem>
        <DropdownMenuItem>Forward</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Reload</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/**
 * Items with trailing keyboard shortcut hints.
 */
export const WithShortcut: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Edit
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          Cut
          <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          Copy
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          Paste
          <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/**
 * Toggleable checkbox items with controlled state.
 */
export const CheckboxItems: Story = {
  render: (args) => {
    const Demo = () => {
      const [statusBar, setStatusBar] = useState(true)
      const [activityBar, setActivityBar] = useState(false)
      return (
        <DropdownMenu {...args}>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            View
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={statusBar}
              onCheckedChange={setStatusBar}
              closeOnClick={false}
            >
              Status bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activityBar}
              onCheckedChange={setActivityBar}
              closeOnClick={false}
            >
              Activity bar
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    return <Demo />
  },
}

/**
 * A single-select radio group inside the menu.
 */
export const RadioGroup: Story = {
  render: (args) => {
    const Demo = () => {
      const [position, setPosition] = useState("bottom")
      return (
        <DropdownMenu {...args}>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Panel position
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Panel position</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={position}
              onValueChange={setPosition}
            >
              <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="bottom">
                Bottom
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
    return <Demo />
  },
}

/**
 * A nested submenu opened from a `DropdownMenuSubTrigger`.
 */
export const Submenu: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open menu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>New tab</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Email</DropdownMenuItem>
            <DropdownMenuItem>Messages</DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem>Print</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/**
 * A disabled item that cannot receive focus or be invoked.
 */
export const DisabledItem: Story = {
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open menu
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem disabled>Billing (unavailable)</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

/**
 * The menu pinned open in dark mode to review surface, focus, and shortcuts.
 */
export const Dark: Story = {
  tags: ["!autodocs"],
  args: {
    defaultOpen: true,
  },
  globals: {
    theme: "dark",
  },
  render: WithShortcut.render,
}

/**
 * Verifies keyboard behaviour: arrow keys move focus between items, `Enter`
 * invokes the focused item (closing the menu), and `Escape` closes it — all
 * asserted against `document.body`.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("button", { name: /open menu/i })

    await step("opening focuses the first item via arrow keys", async () => {
      await userEvent.click(trigger)
      const menu = await body.findByRole("menu")
      await waitFor(() => expect(menu).toHaveAttribute("data-open"))
      await userEvent.keyboard("{ArrowDown}")
      await waitFor(() =>
        expect(body.getByRole("menuitem", { name: /profile/i })).toHaveFocus()
      )
    })

    await step("arrow down moves to the next item", async () => {
      await userEvent.keyboard("{ArrowDown}")
      await waitFor(() =>
        expect(body.getByRole("menuitem", { name: /billing/i })).toHaveFocus()
      )
    })

    await step("Enter invokes the item and closes the menu", async () => {
      await userEvent.keyboard("{Enter}")
      await waitFor(() =>
        expect(body.queryByRole("menu")).not.toBeInTheDocument()
      )
    })

    await step("Escape closes the menu", async () => {
      await userEvent.click(trigger)
      await body.findByRole("menu")
      await userEvent.keyboard("{Escape}")
      await waitFor(() =>
        expect(body.queryByRole("menu")).not.toBeInTheDocument()
      )
    })
  },
}

/**
 * Locks the accent highlight fix: the highlighted item must paint a different
 * background than the (white) popup surface so the active row reads as selected.
 * We focus an item via the keyboard (`focus:bg-accent`) and assert its computed
 * background differs from the menu's own background.
 */
export const HighlightContrast: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("button", { name: /open menu/i })

    await userEvent.click(trigger)
    const menu = await body.findByRole("menu")
    await waitFor(() => expect(menu).toHaveAttribute("data-open"))

    await step("highlighted item differs from the popup surface", async () => {
      await userEvent.keyboard("{ArrowDown}")
      const profile = body.getByRole("menuitem", { name: /profile/i })
      await waitFor(() => expect(profile).toHaveFocus())
      await waitFor(() => {
        const itemBg = getComputedStyle(profile).backgroundColor
        const menuBg = getComputedStyle(menu).backgroundColor
        // The highlight must be a real, non-transparent fill...
        expect(itemBg).not.toBe("rgba(0, 0, 0, 0)")
        expect(itemBg).not.toBe("transparent")
        // ...and distinct from the menu's own (white) background.
        expect(itemBg).not.toBe(menuBg)
      })
    })
  },
}
