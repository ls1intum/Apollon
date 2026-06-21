import type { Meta, StoryObj } from "@storybook/react-vite"
import { MailIcon } from "lucide-react"
import { expect, fn, userEvent, within } from "storybook/test"

import { Button } from "./button"
import { Spinner } from "./spinner"

/**
 * Displays a button or a component that looks like a button. Styling lives in
 * `styles/components.css`, keyed on `data-slot="button"` plus `data-variant`
 * and `data-size`, so the Tailwind-free editor bundle can embed anywhere.
 */
const meta = {
  title: "UI/Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "outline",
        "secondary",
        "ghost",
        "destructive",
        "link",
      ],
    },
    size: {
      control: "select",
      options: [
        "default",
        "xs",
        "sm",
        "lg",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg",
      ],
    },
    disabled: { control: "boolean" },
    children: { control: "text" },
    onClick: { action: "clicked" },
  },
  args: {
    variant: "default",
    size: "default",
    disabled: false,
    children: "Button",
    onClick: fn(),
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

/** The default button, used for primary actions. */
export const Default: Story = {}

/** Reduce emphasis on secondary actions with the `outline` variant. */
export const Outline: Story = {
  args: { variant: "outline" },
}

/** A less conspicuous alternative to the primary button. */
export const Secondary: Story = {
  args: { variant: "secondary" },
}

/** Minimalistic and subtle, for the least intrusive actions. */
export const Ghost: Story = {
  args: { variant: "ghost" },
}

/** Signals destructive or irreversible actions. */
export const Destructive: Story = {
  args: { variant: "destructive" },
}

/** A text-only interactive element for tertiary navigation. */
export const Link: Story = {
  args: { variant: "link" },
}

/** Add an icon alongside the label for clearer visual communication. */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        <MailIcon />
        Login with Email
      </>
    ),
  },
}

/** The `icon` size renders a square button with only an icon. */
export const IconOnly: Story = {
  args: {
    size: "icon",
    variant: "secondary",
    "aria-label": "Mail",
    children: <MailIcon />,
  },
}

/** Pair a disabled button with a `Spinner` child for in-progress actions. */
export const Loading: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <Spinner />
        Saving…
      </>
    ),
  },
}

/** A disabled button ignores user interaction. */
export const Disabled: Story = {
  args: { disabled: true },
}

/**
 * Use the Base UI `render` prop to render the button as another element — here
 * an anchor — while keeping the button styling.
 */
export const AsLink: Story = {
  args: {
    variant: "link",
    render: <a href="#apollon" />,
    children: "Go to Apollon",
  },
}

/** Every variant across every size for visual and dark-theme review. */
export const Matrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: () => {
    const variants = [
      "default",
      "outline",
      "secondary",
      "ghost",
      "destructive",
      "link",
    ] as const
    const sizes = ["xs", "sm", "default", "lg"] as const
    return (
      <div className="flex flex-col gap-4">
        {variants.map((variant) => (
          <div key={variant} className="flex items-center gap-3">
            {sizes.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant}
              </Button>
            ))}
          </div>
        ))}
      </div>
    )
  },
}

/** Pinned dark-theme review of the destructive variant. */
export const Dark: Story = {
  tags: ["!autodocs"],
  globals: { theme: "dark" },
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-3">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
}

/** Interaction test: clicking the button fires its `onClick` handler. */
export const ClickInteraction: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: /button/i })
    await userEvent.click(button)
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}
