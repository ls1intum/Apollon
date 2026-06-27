import type { Meta, StoryObj } from "@storybook/react-vite"
import { AlertTriangleIcon, InfoIcon, XIcon } from "lucide-react"
import { expect, within } from "storybook/test"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert"
import { IconButton } from "./icon-button"

/**
 * Callout banner for contextual messages. The root is a CSS grid that adapts
 * its columns when a leading `<svg>` is present (`has-[>svg]`) and reserves
 * trailing room when an `AlertAction` is rendered (`has-data-[slot=alert-action]`).
 * Two variants: `default` and `destructive`.
 */
const meta = {
  title: "UI/Components/Alert",
  component: Alert,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
      description: "Visual style mirroring the alert cva variants.",
      table: { category: "Appearance" },
    },
  },
  args: {
    variant: "default",
  },
  parameters: { layout: "padded" },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        You can add components to your app using the CLI.
      </AlertDescription>
    </Alert>
  ),
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Destructive: Story = {
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertTriangleIcon />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        Your changes could not be saved. Please try again.
      </AlertDescription>
    </Alert>
  ),
}

/** Icon + title + description — the canonical full layout. */
export const WithIcon: Story = {}

/** Title only, no description or icon (single grid row). */
export const TitleOnly: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertTitle>Your trial ends in 3 days.</AlertTitle>
    </Alert>
  ),
}

/** Description only, without a title. */
export const Description: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertDescription>
        A new software update is available. See what&apos;s new in version 2.0.
      </AlertDescription>
    </Alert>
  ),
}

/** A trailing action absolutely positioned in the reserved right gutter. */
export const WithAction: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Update available</AlertTitle>
      <AlertDescription>Version 2.0 is ready to install.</AlertDescription>
      <AlertAction>
        <IconButton ariaLabel="Dismiss">
          <XIcon />
        </IconButton>
      </AlertAction>
    </Alert>
  ),
}

/** Long, multi-paragraph description to verify text balance/wrapping. */
export const Long: Story = {
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <InfoIcon />
      <AlertTitle>Maintenance window scheduled</AlertTitle>
      <AlertDescription>
        <p>
          We will be performing scheduled maintenance on the diagram service.
          During this window, saving and sharing may be temporarily unavailable.
        </p>
        <p>
          We recommend exporting any in-progress work beforehand. Service is
          expected to resume within one hour.
        </p>
      </AlertDescription>
    </Alert>
  ),
}

/**
 * Every variant crossed with each content shape — icon only, icon + title,
 * icon + title + description, and the full layout with a trailing action.
 */
export const Matrix: Story = {
  tags: ["!autodocs"],
  parameters: { controls: { disable: true } },
  render: () => {
    const variants = ["default", "destructive"] as const
    const Icon = (variant: (typeof variants)[number]) =>
      variant === "destructive" ? <AlertTriangleIcon /> : <InfoIcon />
    return (
      <div className="flex flex-col gap-6">
        {variants.map((variant) => (
          <div key={variant} className="flex flex-col gap-3">
            <Alert variant={variant} className="max-w-md">
              {Icon(variant)}
            </Alert>
            <Alert variant={variant} className="max-w-md">
              {Icon(variant)}
              <AlertTitle>Heads up</AlertTitle>
            </Alert>
            <Alert variant={variant} className="max-w-md">
              {Icon(variant)}
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>
                You can add components to your app using the CLI.
              </AlertDescription>
            </Alert>
            <Alert variant={variant} className="max-w-md">
              {Icon(variant)}
              <AlertTitle>Update available</AlertTitle>
              <AlertDescription>
                Version 2.0 is ready to install.
              </AlertDescription>
              <AlertAction>
                <IconButton ariaLabel="Dismiss">
                  <XIcon />
                </IconButton>
              </AlertAction>
            </Alert>
          </div>
        ))}
      </div>
    )
  },
}

/** Destructive variant pinned to dark for contrast review. */
export const Dark: Story = {
  tags: ["!autodocs"],
  args: { variant: "destructive" },
  globals: { theme: "dark" },
  render: (args) => (
    <Alert {...args} className="max-w-md">
      <AlertTriangleIcon />
      <AlertTitle>Unable to connect</AlertTitle>
      <AlertDescription>Check your network and try again.</AlertDescription>
    </Alert>
  ),
}

/**
 * Interaction test: the root exposes `role="alert"` and renders both the title
 * and description content.
 */
export const Behavior: Story = {
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const alert = canvas.getByRole("alert")
    await expect(alert).toBeInTheDocument()
    await expect(within(alert).getByText("Heads up")).toBeInTheDocument()
    await expect(
      within(alert).getByText(/add components to your app/i)
    ).toBeInTheDocument()
  },
}
