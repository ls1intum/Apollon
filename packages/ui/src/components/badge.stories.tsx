import type { Meta, StoryObj } from "@storybook/react-vite"
import { CheckIcon, ExternalLinkIcon } from "lucide-react"
import { expect, within } from "storybook/test"

import { Badge } from "./badge"

/**
 * Small status / metadata pill. Styled inline via Tailwind utilities compiled
 * through `@source` (see `theme.css`). Renders a `<span>` by default but can be
 * polymorphic through the `render` prop (e.g. an anchor for a clickable badge);
 * the `[a]:` variant rules then apply hover affordances.
 */
const meta = {
  title: "UI/Components/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "secondary",
        "destructive",
        "outline",
        "ghost",
        "link",
      ],
      description: "Visual style mirroring the badge cva variants.",
      table: { category: "Appearance" },
    },
    children: {
      control: "text",
      description: "Badge label content.",
      table: { category: "Data" },
    },
  },
  args: {
    variant: "default",
    children: "Badge",
  },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Secondary: Story = {
  args: { variant: "secondary", children: "Secondary" },
}

export const Destructive: Story = {
  args: { variant: "destructive", children: "Destructive" },
}

export const Outline: Story = {
  args: { variant: "outline", children: "Outline" },
}

export const Ghost: Story = {
  args: { variant: "ghost", children: "Ghost" },
}

export const Link: Story = {
  args: { variant: "link", children: "Link" },
}

/** An icon ahead of the label — the `has-data-[icon=inline-start]` rule tightens the leading padding. */
export const WithIconStart: Story = {
  args: {
    children: (
      <>
        <CheckIcon data-icon="inline-start" />
        Verified
      </>
    ),
  },
}

/** An icon after the label — the `has-data-[icon=inline-end]` rule tightens the trailing padding. */
export const WithIconEnd: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        External
        <ExternalLinkIcon data-icon="inline-end" />
      </>
    ),
  },
}

/** Polymorphic render: an anchor badge picks up the `[a]:hover` affordances. */
export const AsLink: Story = {
  tags: ["test", "!autodocs", "!dev"],
  args: {
    variant: "link",
    render: <a href="#badge" />,
    children: "Go to docs",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: /go to docs/i })
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "#badge")
  },
}

/** The badge stays a single, non-wrapping line and truncates overflow. */
export const LongText: Story = {
  render: (args) => (
    <div className="max-w-32">
      <Badge {...args} />
    </div>
  ),
  args: {
    variant: "secondary",
    children: "A very long badge label that overflows",
  },
}

/** Every variant at a glance, for visual + dark-theme review. */
export const Matrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {(
        [
          "default",
          "secondary",
          "destructive",
          "outline",
          "ghost",
          "link",
        ] as const
      ).map((variant) => (
        <Badge key={variant} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
}

/** Destructive badge pinned to dark for contrast review (background tint + ring). */
export const Dark: Story = {
  tags: ["!autodocs"],
  args: { variant: "destructive", children: "Failed" },
  globals: { theme: "dark" },
}
