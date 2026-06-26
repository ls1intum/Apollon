import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { Button } from "./button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"

/**
 * A floating card that opens on pointer hover (and keyboard focus) to preview
 * content, built on Base UI's `PreviewCard`. It portals to `document.body`,
 * is non-interactive by design (pointer-only, no focus trap), and exposes the
 * positioner props (`side`, `sideOffset`, `align`, `alignOffset`). Use it for
 * desktop diagram previews; it is purely supplementary, so do not put
 * essential actions inside it.
 */
const meta = {
  title: "UI/Components/HoverCard",
  component: HoverCard,
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
  },
} satisfies Meta<typeof HoverCard>

export default meta

type Story = StoryObj<typeof meta>

const sides = ["top", "right", "bottom", "left"] as const

/**
 * The default hover card opened by hovering the trigger.
 */
export const Default: Story = {
  render: (args) => (
    <HoverCard {...args}>
      <HoverCardTrigger render={<Button variant="link" />}>
        @apollon
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Apollon</p>
          <p className="text-muted-foreground">
            The open-source UML modeling editor — created and maintained by TUM
            AET.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}

/**
 * Opens immediately and closes immediately via `delay={0}` / `closeDelay={0}`
 * on the trigger.
 */
export const Instant: Story = {
  render: (args) => (
    <HoverCard {...args}>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={<Button variant="link" />}
      >
        @apollon
      </HoverCardTrigger>
      <HoverCardContent>
        The open-source UML modeling editor — created and maintained by TUM AET.
      </HoverCardContent>
    </HoverCard>
  ),
}

/**
 * One trigger per `side` value to review placement in light and dark.
 */
export const Sides: Story = {
  tags: ["!autodocs"],
  render: () => (
    <div className="flex flex-wrap gap-2">
      {sides.map((side) => (
        <HoverCard key={side}>
          <HoverCardTrigger render={<Button variant="outline" />}>
            {side}
          </HoverCardTrigger>
          <HoverCardContent side={side} className="w-auto">
            <p className="capitalize">Opens on the {side}.</p>
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  ),
}

/**
 * The hover card pinned open in dark mode to review surface, ring, and text.
 */
export const Dark: Story = {
  tags: ["!autodocs"],
  args: {
    defaultOpen: true,
  },
  globals: {
    theme: "dark",
  },
  render: Default.render,
}

/**
 * Verifies portalled behaviour: hovering the trigger opens the card and
 * unhovering closes it — asserted against `document.body` since Base UI
 * portals there.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  render: (args) => (
    <HoverCard {...args}>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        render={<Button variant="link" />}
      >
        @apollon
      </HoverCardTrigger>
      <HoverCardContent>Preview content.</HoverCardContent>
    </HoverCard>
  ),
  play: async ({ canvasElement, step }) => {
    const body = within(canvasElement.ownerDocument.body)
    const trigger = await body.findByRole("button", { name: /@apollon/i })

    await step("hovering the trigger opens the card", async () => {
      await userEvent.hover(trigger)
      await waitFor(() =>
        expect(body.getByText(/preview content/i)).toBeVisible()
      )
    })

    await step("unhovering the trigger closes the card", async () => {
      await userEvent.unhover(trigger)
      await waitFor(() =>
        expect(body.queryByText(/preview content/i)).not.toBeInTheDocument()
      )
    })
  },
}
