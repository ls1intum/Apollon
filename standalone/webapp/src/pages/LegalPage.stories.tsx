import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import {
  setLegalResolver,
  type LegalResolver,
  type ResolvedLegalContent,
} from "@/lib/legal"
import { LEGAL_PAGE_TITLES } from "@/lib/legal"
import { LegalPage } from "./LegalPage"

/**
 * The legal content page (`/imprint`, `/privacy`). It resolves Markdown
 * (override → profile → disclaimer fallback) and renders it via sanitized
 * react-markdown. These stories bind a stub resolver so no network or on-disk
 * profile is needed.
 *
 * `ImprintPage` / `PrivacyPage` are thin wrappers over `LegalPage` with a
 * fixed page + title; they aren't storyable without a configured backend
 * profile, so the variants below stand in for both.
 */

const IMPRINT_MARKDOWN = `## Operator

**Example Organization e.V.**
Sample Street 1
12345 Example City

Represented by: Jane Doe

Contact: [legal@example.org](mailto:legal@example.org)

### Liability

Despite careful content control, we assume no liability for the content of
external links. The operators of linked pages are solely responsible for
their content.`

const PRIVACY_MARKDOWN = `## Privacy at a glance

We process personal data only as far as necessary to provide a functional
website and our content and services.

### Your rights

- Access to your stored data
- Correction of inaccurate data
- Deletion of your data
- Restriction of processing

For any request, contact [privacy@example.org](mailto:privacy@example.org).`

const makeResolver =
  (
    markdown: string,
    source: ResolvedLegalContent["source"] = "profile"
  ): LegalResolver =>
  async () => ({ markdown, source, profile: "storybook" })

const failingResolver: LegalResolver = async () => {
  throw new Error("Unable to load legal content.")
}

const meta = {
  title: "Webapp/Pages/LegalPage",
  component: LegalPage,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    page: "imprint",
    title: LEGAL_PAGE_TITLES.imprint,
    profileOverride: "storybook",
  },
} satisfies Meta<typeof LegalPage>

export default meta
type Story = StoryObj<typeof meta>

/** Imprint page rendered from stubbed profile Markdown. */
export const Imprint: Story = {
  beforeEach: () => setLegalResolver(makeResolver(IMPRINT_MARKDOWN)),
}

/** Privacy page rendered from stubbed profile Markdown. */
export const Privacy: Story = {
  args: {
    page: "privacy",
    title: LEGAL_PAGE_TITLES.privacy,
  },
  beforeEach: () => setLegalResolver(makeResolver(PRIVACY_MARKDOWN)),
}

/**
 * Disclaimer fallback: when no legal profile is configured, the resolver
 * returns placeholder content and the page shows the warning banner.
 */
export const DisclaimerFallback: Story = {
  beforeEach: () =>
    setLegalResolver(
      makeResolver(
        "This is placeholder legal content for an unconfigured deployment.",
        "disclaimer"
      )
    ),
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The "disclaimer" source must surface the banner AND still render the
    // placeholder prose (tagged data-source="disclaimer"), not swallow it.
    await expect(
      await canvas.findByTestId("legal-disclaimer-banner")
    ).toHaveTextContent(/has not been configured with a legal profile/i)
    await expect(await canvas.findByTestId("legal-content")).toHaveAttribute(
      "data-source",
      "disclaimer"
    )
  },
}

/** Error state: the resolver rejects and the page shows the error alert. */
export const ErrorState: Story = {
  beforeEach: () => setLegalResolver(failingResolver),
  tags: ["test", "!autodocs", "!dev"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // A rejected resolver swaps the article for the error alert: assert the
    // copy appears and that no content article was rendered.
    await expect(
      await canvas.findByText(/unable to load legal content/i)
    ).toBeInTheDocument()
    await expect(canvas.queryByTestId("legal-content")).toBeNull()
  },
}

/** Verifies the stubbed Markdown reaches the rendered article. */
export const RendersContent: Story = {
  beforeEach: () => setLegalResolver(makeResolver(IMPRINT_MARKDOWN)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Scope to the `<main>` content region: PageShell renders the legal prose in
    // `<main>`, a SIBLING of the sticky `<header role="banner">` (kept top-level
    // so axe's landmark-banner-is-top-level passes). Asserting the content lands
    // in `main` pins that structure, not just that the text exists somewhere.
    const main = within(await canvas.findByRole("main"))
    await expect(
      await main.findByText(/example organization/i)
    ).toBeInTheDocument()

    // The page's SINGLE <h1> is the page title, a real heading at the top of the
    // content `<main>` (the header band carries no title). Assert exactly one
    // level-1 heading, that it carries the page title, and that it lives in main.
    const headings = await canvas.findAllByRole("heading", { level: 1 })
    await expect(headings).toHaveLength(1)
    await expect(headings[0]).toHaveTextContent(LEGAL_PAGE_TITLES.imprint)
    await expect(
      await main.findByRole("heading", { level: 1 })
    ).toHaveTextContent(LEGAL_PAGE_TITLES.imprint)
  },
}
