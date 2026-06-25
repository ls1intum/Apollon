import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import { ErrorPage } from "./ErrorPage"

/**
 * The full-page error/fallback screen. Renders inside `PageShell`, so a sticky
 * chrome header (with its own "All diagrams" back link) sits above a `<main>`
 * holding a large DECORATIVE title splash (`aria-hidden`), the message, and a
 * router `<Link>` recovery CTA. The page's single `<h1>` is the page title in
 * the sticky title island — filling the formerly-empty header centre — so the
 * body splash is presentational, not a second heading. The CTA's default label
 * is "Back to all diagrams" — distinct from the header's terse "All diagrams" so
 * the two links never collide on accessible name. All props have sensible
 * defaults so it doubles as a generic 404/500.
 */
const meta = {
  title: "Webapp/Pages/ErrorPage",
  component: ErrorPage,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Oops!",
    message: "Something went wrong.",
    buttonLabel: "Back to all diagrams",
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
    // Scope to the `<main>` content region: the chrome header also carries an
    // "All diagrams" back link, so an unscoped /all diagrams/i query would match
    // both. The recovery CTA lives in `main` and reads "Back to all diagrams".
    const main = within(await canvas.findByRole("main"))
    const cta = await main.findByRole("link", {
      name: /back to all diagrams/i,
    })
    await expect(cta).toHaveAttribute("href", "/")

    // The page's SINGLE <h1> is the title, a real heading in the content `<main>`
    // (the header band carries no title). Assert exactly one level-1 heading,
    // that it carries the title, and that it lives in main.
    const headings = await canvas.findAllByRole("heading", { level: 1 })
    await expect(headings).toHaveLength(1)
    await expect(headings[0]).toHaveTextContent("Oops!")
    await expect(
      await main.findByRole("heading", { level: 1 })
    ).toHaveTextContent("Oops!")
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
