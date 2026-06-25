import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Button } from "./button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"

/**
 * A hover/focus tooltip built on Base UI's `Tooltip`. Wrap the app (or a
 * subtree) in `TooltipProvider` to share open/close delays. `TooltipContent`
 * exposes positioner props (`side`, `sideOffset`, `align`, `alignOffset`) and
 * always renders an arrow. The popup portals to `document.body`.
 */
const meta = {
  title: "UI/Components/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
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
  },
  decorators: [
    (Story) => (
      <TooltipProvider delay={0}>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta

type Story = StoryObj<typeof meta>

const sides = ["top", "right", "bottom", "left"] as const

/**
 * The default tooltip shown on hover or focus of the trigger.
 */
export const Default: Story = {
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger render={<Button variant="outline" />}>
        Hover me
      </TooltipTrigger>
      <TooltipContent>Add to library</TooltipContent>
    </Tooltip>
  ),
}

/**
 * One trigger per `side` value to review placement and the arrow in light and
 * dark.
 */
export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {sides.map((side) => (
        <Tooltip key={side} open>
          <TooltipTrigger render={<Button variant="outline" />}>
            {side}
          </TooltipTrigger>
          <TooltipContent side={side}>Opens on the {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}

/**
 * The tooltip arrow is always rendered; this pins one open to inspect it.
 */
export const WithArrow: Story = {
  args: {
    open: true,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger render={<Button variant="outline" />}>
        Hover me
      </TooltipTrigger>
      <TooltipContent>The arrow points back at the trigger</TooltipContent>
    </Tooltip>
  ),
}

/**
 * Tooltips can hold richer, multi-line content.
 */
export const RichContent: Story = {
  args: {
    open: true,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger render={<Button variant="outline" />}>
        Keyboard shortcut
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <span className="font-medium">Save document</span>
          {/* The tooltip surface is inverted (`bg-foreground text-background`),
              so a dimmed secondary line must dim the *background* colour, not
              use `text-muted-foreground` (a mid-gray tuned for light surfaces —
              ~3.4:1 on the dark tooltip). `text-background/70` stays legible. */}
          <span className="text-background/70">Press Cmd + S</span>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
}

/**
 * A shared `TooltipProvider` with a non-zero `delay` so multiple triggers reuse
 * the same hover timing.
 */
export const DelayProvider: Story = {
  decorators: [
    (Story) => (
      <TooltipProvider delay={600}>
        <Story />
      </TooltipProvider>
    ),
  ],
  render: () => (
    <div className="flex gap-4">
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          First
        </TooltipTrigger>
        <TooltipContent>Waits 600ms on first hover</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>
          Second
        </TooltipTrigger>
        <TooltipContent>Opens instantly while the group is warm</TooltipContent>
      </Tooltip>
    </div>
  ),
}

/**
 * The tooltip pinned open in dark mode to review the popup surface, text
 * contrast, and arrow.
 */
export const Dark: Story = {
  globals: { theme: "dark" },
  args: {
    open: true,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger render={<Button variant="outline" />}>
        Hover me
      </TooltipTrigger>
      <TooltipContent>Reviewing dark-mode contrast</TooltipContent>
    </Tooltip>
  ),
}

/**
 * Verifies portalled behaviour: hovering the trigger shows the tooltip in
 * `document.body`, and blurring/unhovering hides it.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: Default.render,
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("button", { name: /hover me/i })

    await step("hover shows the tooltip in the body", async () => {
      await userEvent.hover(trigger)
      await waitFor(() =>
        expect(body.getByText(/add to library/i)).toBeVisible()
      )
    })

    await step("unhover hides the tooltip", async () => {
      await userEvent.unhover(trigger)
      await waitFor(() =>
        expect(body.queryByText(/add to library/i)).not.toBeInTheDocument()
      )
    })
  },
}
