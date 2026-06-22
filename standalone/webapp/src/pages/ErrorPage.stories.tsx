import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { ErrorPage } from "./ErrorPage"

/**
 * The full-page error/fallback screen. Shows a title, a message, and a router
 * `<Link>` back to a recovery destination (defaults to the diagram dashboard).
 * All four props have sensible defaults so it doubles as a generic 404/500.
 */
const meta = {
  title: "Webapp/Pages/ErrorPage",
  component: ErrorPage,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Oops!",
    message: "Something went wrong.",
    buttonLabel: "All diagrams",
    backPath: "/",
  },
  argTypes: {
    title: { control: "text", table: { category: "Content" } },
    message: { control: "text", table: { category: "Content" } },
    buttonLabel: { control: "text", table: { category: "Content" } },
    backPath: { control: "text", table: { category: "Navigation" } },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ErrorPage>

export default meta
type Story = StoryObj<typeof meta>

/** The generic fallback with default copy. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = await canvas.findByRole("link", { name: /all diagrams/i })
    await expect(link).toHaveAttribute("href", "/")
  },
}

/** A 404 not-found variant. */
export const NotFound: Story = {
  args: {
    title: "404",
    message: "We couldn't find the page you were looking for.",
    buttonLabel: "Back to dashboard",
  },
}

/** A longer, wrapping error message. */
export const LongMessage: Story = {
  args: {
    title: "Something broke",
    message:
      "The diagram could not be loaded because the server returned an unexpected response. Please try again in a moment or head back to your diagrams.",
  },
}
