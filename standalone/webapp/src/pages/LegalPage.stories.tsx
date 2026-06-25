import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"
import type { ResolvedLegalContent } from "@/lib/legal"
import { LEGAL_PAGE_TITLES } from "@/lib/legal"
import { LegalPage } from "./LegalPage"

/**
 * The legal content page (`/imprint`, `/privacy`). It resolves Markdown through
 * an injectable `resolver` (override → profile → disclaimer fallback) and
 * renders it via sanitized react-markdown. Production callers pass no resolver;
 * these stories inject a stub so no network or on-disk profile is needed.
 *
 * `ImprintPage` / `PrivacyPage` are thin wrappers that call `LegalPage` with a
 * fixed `page` + title and no resolver — they aren't storyable without a
 * configured backend profile, so the resolver-injected variants below stand in
 * for both.
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
  ): typeof import("@/lib/legal").resolveLegalContent =>
  async () => ({ markdown, source, profile: "storybook" })

const failingResolver: typeof import("@/lib/legal").resolveLegalContent =
  async () => {
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
  args: {
    resolver: makeResolver(IMPRINT_MARKDOWN),
  },
}

/** Privacy page rendered from stubbed profile Markdown. */
export const Privacy: Story = {
  args: {
    page: "privacy",
    title: LEGAL_PAGE_TITLES.privacy,
    resolver: makeResolver(PRIVACY_MARKDOWN),
  },
}

/**
 * Disclaimer fallback: when no legal profile is configured, the resolver
 * returns placeholder content and the page shows the warning banner.
 */
export const DisclaimerFallback: Story = {
  args: {
    resolver: makeResolver(
      "This is placeholder legal content for an unconfigured deployment.",
      "disclaimer"
    ),
  },
}

/** Error state: the resolver rejects and the page shows the error alert. */
export const ErrorState: Story = {
  args: {
    resolver: failingResolver,
  },
}

/** Verifies the stubbed Markdown reaches the rendered article. */
export const RendersContent: Story = {
  args: {
    resolver: makeResolver(IMPRINT_MARKDOWN),
  },
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

    // The page's SINGLE <h1> now lives in the sticky title island (filling the
    // formerly-empty header centre), NOT in the content. Assert exactly one
    // heading, that it carries the page title, and that it is OUTSIDE `<main>` —
    // pinning the moved-heading structure (one h1 per page, in the band).
    const headings = await canvas.findAllByRole("heading", { level: 1 })
    await expect(headings).toHaveLength(1)
    await expect(headings[0]).toHaveTextContent(LEGAL_PAGE_TITLES.imprint)
    await expect(main.queryByRole("heading", { level: 1 })).toBeNull()
  },
}
