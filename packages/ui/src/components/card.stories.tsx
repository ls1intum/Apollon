import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { Button } from "./button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

/**
 * Surface container with composable header / content / footer / action slots.
 * The `size` prop (`default` | `sm`) drives the `--card-spacing` custom
 * property and tightens the title via `data-[size=sm]`. Styled inline via
 * Tailwind utilities; footers and leading images get edge-to-edge treatment.
 */
const meta = {
  title: "UI/Components/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["default", "sm"],
      description: "Spacing scale; `sm` also shrinks the title.",
      table: { category: "Appearance" },
    },
  },
  args: {
    size: "default",
  },
  parameters: { layout: "padded" },
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Class Diagram</CardTitle>
        <CardDescription>Last edited 2 hours ago</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        A UML class diagram modelling the domain entities and their relations.
      </CardContent>
    </Card>
  ),
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = {
  args: { size: "sm" },
}

export const WithHeaderFooter: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Invite your team</CardTitle>
        <CardDescription>Collaborate on diagrams together.</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Share a link and start editing in real time.
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
        <Button size="sm">Invite</Button>
      </CardFooter>
    </Card>
  ),
}

/** An action anchored top-right of the header (the header grid reserves a column). */
export const WithAction: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            Manage
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Configure how and when you are notified.
      </CardContent>
    </Card>
  ),
}

/** A leading image bleeds to the card edges and clips to the top corners. */
export const WithImage: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <img
        src="https://placehold.co/320x160/0f3a66/ffffff/png?text=Preview"
        alt="Diagram preview"
        className="h-40 w-full object-cover"
      />
      <CardHeader>
        <CardTitle>Activity Diagram</CardTitle>
        <CardDescription>Shared with your team</CardDescription>
      </CardHeader>
    </Card>
  ),
}

/** Header + action + content + footer composed together. */
export const FullExample: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Upgrade to Pro</CardTitle>
        <CardDescription>Unlock unlimited diagrams.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Compare
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        Get version history, private sharing, and priority support.
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm">Upgrade</Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * The white card on the painted base surface. Card and popover are both white
 * (`#ffffff`), so a card separates from the canvas with only `ring-1
 * ring-foreground/10` plus a subtle `shadow-xs`. This story makes that
 * separation explicit by placing the card on the `--home-surface-base` paint.
 */
export const OnSurface: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div
      className="flex justify-center p-12"
      style={{ backgroundColor: "var(--home-surface-base)" }}
    >
      <Card {...args} className="w-80">
        <CardHeader>
          <CardTitle>Class Diagram</CardTitle>
          <CardDescription>Last edited 2 hours ago</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          A UML class diagram modelling the domain entities and their relations.
        </CardContent>
      </Card>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByText("Class Diagram").closest('[data-slot="card"]')
    // The card relies on a ring + subtle shadow to lift off the white surface.
    await expect(card).toHaveClass("ring-1", "ring-foreground/10", "shadow-xs")
  },
}

/** Default vs `sm` spacing side by side for visual + dark review. */
export const Matrix: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {(["default", "sm"] as const).map((size) => (
        <Card key={size} size={size} className="w-72">
          <CardHeader>
            <CardTitle>size: {size}</CardTitle>
            <CardDescription>Spacing scale demonstration</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Body copy reflows with the card spacing token.
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline" size="sm">
              Action
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
}

/** Pinned dark for surface/ring/footer-divider contrast review. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Class Diagram</CardTitle>
        <CardDescription>Last edited 2 hours ago</CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground">
        A UML class diagram modelling the domain entities and their relations.
      </CardContent>
      <CardFooter className="justify-end">
        <Button size="sm">Open</Button>
      </CardFooter>
    </Card>
  ),
}
