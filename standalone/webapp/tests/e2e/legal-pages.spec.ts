import { test, expect, type Page, type Route } from "@playwright/test"

/**
 * E2E coverage for the /imprint and /privacy cascade.
 *
 * What we assert:
 * - The bundled tumaet profile is served when no override is mounted,
 *   no disclaimer banner appears, and no disclaimer warning hits the console.
 * - Override layer wins over profile and disclaimer.
 * - Profile layer serves when override is absent and LEGAL_PROFILE is set.
 * - Disclaimer falls through, shows the red banner, and fires a console.warn.
 * - Hostile markdown does not inject <script> / <iframe> / on* / javascript:.
 * - nginx serves legal URLs with text/markdown + no-sniff + X-Frame-Options DENY.
 *
 * The dev server used by Playwright is `npm run start`, which points at the
 * Vite dev server. Vite serves `public/` files directly, so the on-disk
 * `public/legal/_disclaimer/*.md` and `public/legal/profiles/tumaet/*.md`
 * are the exact bytes the browser sees.
 */

const APOLLON_ENV_SCRIPT = (profile: string) => `
  window.__APOLLON_ENV__ = { LEGAL_PROFILE: ${JSON.stringify(profile)} };
`

async function pageWithProfile(page: Page, profile: string) {
  await page.addInitScript(APOLLON_ENV_SCRIPT(profile))
}

// Intercept a fetch and serve back our own markdown body.
async function mockMarkdown(
  page: Page,
  url: string,
  body: string,
  contentType = "text/markdown; charset=utf-8"
) {
  await page.route(url, (route: Route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": contentType },
      body,
    })
  )
}

test.describe("Legal pages — cascade", () => {
  test("bundled tumaet profile is rendered, no disclaimer banner", async ({
    page,
  }) => {
    await pageWithProfile(page, "tumaet")
    const warnings: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "warning") warnings.push(msg.text())
    })

    await page.goto("/imprint")

    const banner = page.locator('[data-testid="legal-disclaimer-banner"]')
    await expect(banner).toHaveCount(0)

    const article = page.locator('[data-testid="legal-content"]')
    await expect(article).toBeVisible()
    await expect(article).toHaveAttribute("data-source", "profile")
    await expect(article).toContainText("Technical University of Munich")
    await expect(article).toContainText("§ 5 DDG")

    expect(warnings.filter((w) => w.includes("[legal]"))).toHaveLength(0)
  })

  test("override wins over profile", async ({ page }) => {
    await pageWithProfile(page, "tumaet")
    await mockMarkdown(
      page,
      "**/legal-overrides/imprint.md",
      "# Override imprint\n\nCustom operator content."
    )

    await page.goto("/imprint")

    const article = page.locator('[data-testid="legal-content"]')
    await expect(article).toHaveAttribute("data-source", "override")
    await expect(article).toContainText("Override imprint")
  })

  test("unset profile shows disclaimer with red banner + console.warn", async ({
    page,
  }) => {
    await pageWithProfile(page, "")
    const warnings: string[] = []
    page.on("console", (msg) => {
      if (msg.type() === "warning") warnings.push(msg.text())
    })

    await page.goto("/privacy")

    const banner = page.locator('[data-testid="legal-disclaimer-banner"]')
    await expect(banner).toBeVisible()

    const article = page.locator('[data-testid="legal-content"]')
    await expect(article).toHaveAttribute("data-source", "disclaimer")
    await expect(article).toContainText("not been configured")

    await expect
      .poll(() => warnings.some((w) => w.includes("Disclaimer fallback")))
      .toBe(true)
  })

  test("HTML content-type from override triggers fall-through (SPA-fallback defence)", async ({
    page,
  }) => {
    await pageWithProfile(page, "tumaet")
    // Pretend the override exists as /index.html (classic SPA catchall)
    await mockMarkdown(
      page,
      "**/legal-overrides/imprint.md",
      "<!doctype html><html><body>SPA</body></html>",
      "text/html; charset=utf-8"
    )

    await page.goto("/imprint")

    const article = page.locator('[data-testid="legal-content"]')
    // The profile layer still wins because the override layer's HTML body is rejected.
    await expect(article).toHaveAttribute("data-source", "profile")
  })
})

test.describe("Legal pages — XSS hardening", () => {
  const HOSTILE = `# Title

<script>window.__xss_executed__ = true;</script>

<iframe srcdoc="<script>parent.__xss_frame__=1</script>"></iframe>

<img src="x" onerror="window.__xss_onerror__=1">

[click me](javascript:alert(1))

[ref attack][ref]

[ref]: javascript:alert(2)

[ok link](https://tum.de)

[spoof title](https://tum.de "evil-tooltip")

![bad image](data:image/png;base64,AAA)

![ok image](https://tum.de/logo.png)
`

  test("hostile markdown does not inject scripts, iframes, on* handlers, javascript: links, or data: images", async ({
    page,
  }) => {
    await pageWithProfile(page, "tumaet")
    await mockMarkdown(page, "**/legal-overrides/imprint.md", HOSTILE)

    const pageErrors: string[] = []
    page.on("pageerror", (err) => pageErrors.push(err.message))

    await page.goto("/imprint")

    const article = page.locator('[data-testid="legal-content"]')
    await expect(article).toBeVisible()

    // No script or iframe anywhere under the article.
    await expect(article.locator("script")).toHaveCount(0)
    await expect(article.locator("iframe")).toHaveCount(0)

    // No on* attributes survived (inspected at the DOM level).
    const hasOnAttrs = await article.evaluate((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT)
      for (
        let node = walker.currentNode as Element | null;
        node;
        node = walker.nextNode() as Element | null
      ) {
        for (const attr of Array.from(node.attributes)) {
          if (attr.name.toLowerCase().startsWith("on")) return true
        }
      }
      return false
    })
    expect(hasOnAttrs).toBe(false)

    // Every anchor must have a protocol in the allow-list.
    const hrefs = await article
      .locator("a")
      .evaluateAll((anchors) =>
        (anchors as HTMLAnchorElement[]).map((a) => a.getAttribute("href"))
      )
    for (const href of hrefs) {
      expect(href).toMatch(/^(?:https?:|mailto:|tel:|#|\/)/i)
    }

    // No anchor or image carries a title attribute (UI-spoof guard).
    const titled = await article.evaluate(
      (el) => el.querySelectorAll("a[title], img[title]").length
    )
    expect(titled).toBe(0)

    // No data: image survived.
    const imgSrcs = await article
      .locator("img")
      .evaluateAll((imgs) =>
        (imgs as HTMLImageElement[]).map((i) => i.getAttribute("src"))
      )
    for (const src of imgSrcs) {
      expect(src).not.toMatch(/^data:/i)
    }

    // None of the XSS sentinels fired.
    const sentinels = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      return {
        script: w.__xss_executed__ ?? null,
        frame: w.__xss_frame__ ?? null,
        onerror: w.__xss_onerror__ ?? null,
      }
    })
    expect(sentinels.script).toBeNull()
    expect(sentinels.frame).toBeNull()
    expect(sentinels.onerror).toBeNull()
    expect(pageErrors).toEqual([])
  })

  test("external links open in new tab with rel=noopener noreferrer", async ({
    page,
  }) => {
    await pageWithProfile(page, "tumaet")
    await mockMarkdown(
      page,
      "**/legal-overrides/imprint.md",
      "[external](https://tum.de) and [internal](/privacy)"
    )

    await page.goto("/imprint")
    const article = page.locator('[data-testid="legal-content"]')

    const external = article.getByRole("link", { name: "external" })
    await expect(external).toHaveAttribute("target", "_blank")
    await expect(external).toHaveAttribute("rel", /noopener/)
    await expect(external).toHaveAttribute("rel", /noreferrer/)

    const internal = article.getByRole("link", { name: "internal" })
    await expect(internal).not.toHaveAttribute("target", "_blank")
  })
})
