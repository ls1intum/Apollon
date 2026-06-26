import { test, expect, type Page } from "@playwright/test"

// Lazy gallery + thumbnail warmup hydrate slowly under parallel workers.
test.describe.configure({ timeout: 60_000 })

/**
 * E2E tests for the redesigned "Your diagrams" home dashboard.
 *
 * The old marketing-style homepage (hero, section nav, inline diagram-type
 * grid, "Load more" button, etc.) was replaced by a single DiagramGallery
 * dashboard. These tests assert against the NEW DOM only — see
 *   - src/pages/HomePage.tsx
 *   - src/components/home/DiagramGallery.tsx
 *   - src/components/home/DiagramCard.tsx
 */

// ---------------------------------------------------------------------------
// Seed helper — writes diagrams into the persistenceModelStore localStorage
// entry, then reloads so the lazy DiagramGallery hydrates from them.
// ---------------------------------------------------------------------------

async function seedDiagrams(
  page: Page,
  diagrams: Array<{
    id: string
    title: string
    type?: string
    lastModifiedAt?: string
    createdAt?: string
    favorite?: boolean
  }>
) {
  const models: Record<string, unknown> = {}
  for (const d of diagrams) {
    const timestamp = d.lastModifiedAt ?? new Date().toISOString()
    models[d.id] = {
      id: d.id,
      model: {
        id: d.id,
        type: d.type ?? "ClassDiagram",
        title: d.title,
        nodes: [],
        edges: [],
        assessments: {},
        version: "4.0.0",
      },
      lastModifiedAt: timestamp,
      createdAt: d.createdAt ?? timestamp,
      favorite: d.favorite ?? false,
    }
  }
  await page.goto("/")
  await page
    .getByRole("heading", { level: 1, name: "Your diagrams" })
    .waitFor({ timeout: 15_000 })
  await page.evaluate(
    (storeValue) => {
      localStorage.setItem("persistenceModelStore", storeValue)
    },
    JSON.stringify({ state: { models, currentModelId: null }, version: 1 })
  )
  await page.reload()

  // The seeded cards hydrating is the deterministic ready signal (the old
  // "{n} diagrams" count label moved into the band as a bare number). The grid
  // pages at 9 cards, so wait on the first card rather than the full set.
  await page.locator('[role="listitem"]').first().waitFor({ timeout: 15_000 })
}

async function seedEmpty(page: Page) {
  await page.goto("/")
  await page
    .getByRole("heading", { level: 1, name: "Your diagrams" })
    .waitFor({ timeout: 15_000 })
  await page.evaluate(() => {
    localStorage.setItem(
      "persistenceModelStore",
      JSON.stringify({
        state: { models: {}, currentModelId: null },
        version: 1,
      })
    )
  })
  await page.reload()
  // Heading renders once the home page has hydrated — a deterministic signal
  // instead of the flaky `networkidle`.
  await page
    .getByRole("heading", { level: 1, name: "Your diagrams" })
    .waitFor({ timeout: 15_000 })
}

const cards = (page: Page) => page.locator('[role="listitem"]')

// ---------------------------------------------------------------------------
// 1. Initial load
// ---------------------------------------------------------------------------

test.describe("Home page — initial load", () => {
  test.beforeEach(async ({ page }) => {
    await seedDiagrams(page, [{ id: "init-1", title: "Initial Diagram" }])
  })

  test("renders the 'Your diagrams' heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "Your diagrams" })
    ).toBeVisible()
  })

  test("renders the header CTAs", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "New diagram" })
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "Import" })).toBeVisible()
  })

  test("shows the home band with a theme toggle", async ({ page }) => {
    // The band's brand island carries the page banner; the theme toggle lives
    // in the actions island on the right.
    await expect(page.getByRole("banner", { name: "Home" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Switch to (light|dark) mode/ })
    ).toBeVisible()
  })

  test("does not show the editor Navbar", async ({ page }) => {
    await expect(page.locator("#file-menu-button")).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Empty state
// ---------------------------------------------------------------------------

test.describe("Home page — empty state (no diagrams)", () => {
  test.beforeEach(async ({ page }) => {
    await seedEmpty(page)
  })

  test("shows the 'No diagrams yet' empty state", async ({ page }) => {
    await expect(page.getByText("No diagrams yet")).toBeVisible()
  })

  test("shows the empty-state action buttons", async ({ page }) => {
    // "New diagram" / "Import" appear in header + empty state; .first() picks one.
    await expect(
      page.getByRole("button", { name: "New diagram" }).first()
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Import" }).first()
    ).toBeVisible()
  })

  test("clicking 'New diagram' opens the new-diagram dialog", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New diagram" }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(
      page.getByRole("dialog").getByText("New Diagram", { exact: true })
    ).toBeVisible()
    await expect(page.getByRole("tab", { name: "Blank diagram" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Use template" })).toBeVisible()
  })

  test("the shared name field updates with the selected creation mode", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New diagram" }).first().click()

    const nameInput = page.getByRole("textbox", { name: "Name" })

    // A blank diagram is created untitled (empty name → muted placeholder); a
    // template pre-fills its own name as the sensible default.
    await expect(nameInput).toHaveValue("")
    await page.getByRole("tab", { name: "Use template" }).click()
    await expect(nameInput).toHaveValue("Adapter")
    await expect(page.getByText("Selected Template")).toHaveCount(0)
    await page.getByRole("button", { name: "Observer" }).click()
    await expect(nameInput).toHaveValue("Observer")
  })
})

// ---------------------------------------------------------------------------
// 3. Diagram gallery
// ---------------------------------------------------------------------------

test.describe("Home page — diagram gallery", () => {
  test.beforeEach(async ({ page }) => {
    await seedDiagrams(page, [
      { id: "d1", title: "Alpha" },
      { id: "d2", title: "Beta" },
      { id: "d3", title: "Gamma" },
    ])
  })

  test("renders each seeded diagram as a listitem card", async ({ page }) => {
    await expect(cards(page)).toHaveCount(3)
  })

  test("shows the result count in the search island", async ({ page }) => {
    // The count moved into the band's search island as a bare number alongside
    // the search field.
    const search = page.getByRole("searchbox", {
      name: "Search diagrams by name",
    })
    await expect(
      search.locator("xpath=ancestor::*[@aria-label='Search diagrams']")
    ).toContainText("3")
  })

  test("search filters cards by title", async ({ page }) => {
    await page
      .getByRole("searchbox", { name: "Search diagrams by name" })
      .fill("Alpha")
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText("Alpha")
  })

  test("clearing search restores all cards", async ({ page }) => {
    const search = page.getByRole("searchbox", {
      name: "Search diagrams by name",
    })
    await search.fill("Alpha")
    await expect(cards(page)).toHaveCount(1)
    await search.fill("")
    await expect(cards(page)).toHaveCount(3)
  })

  test("no-match search shows the 'No diagrams match' message", async ({
    page,
  }) => {
    await page
      .getByRole("searchbox", { name: "Search diagrams by name" })
      .fill("zzz-no-match")
    await expect(
      page.getByText("No diagrams match your search and filters.")
    ).toBeVisible()
  })

  test("source scope (via Refine) narrows to local diagrams", async ({
    page,
  }) => {
    // Source moved into the Refine popover. All seeded diagrams are local, so
    // "Local" keeps all 3; "Shared" shows the empty shared state.
    await page.getByRole("button", { name: "Refine" }).click()
    await page.getByRole("button", { name: "Local", exact: true }).click()
    await expect(cards(page)).toHaveCount(3)
    await page.getByRole("button", { name: "Shared", exact: true }).click()
    await expect(page.getByText("No shared diagrams yet")).toBeVisible()
  })

  test("type filter (via Refine) shows only matching diagrams", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Refine" }).click()
    // Every seeded diagram is a ClassDiagram, so its type appears in the panel.
    await page
      .getByRole("group", { name: "Type" })
      .getByRole("button", { name: "Class Diagram", exact: true })
      .click()
    await expect(cards(page)).toHaveCount(3)
  })

  test("sort (via Refine) can switch to alphabetical, oldest first", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Refine" }).click()
    await page
      .getByRole("group", { name: "Sort by" })
      .getByRole("button", { name: "Alphabetical" })
      .click()
    // For the Alphabetical field the Order toggle reads in its own vocabulary:
    // "A–Z" (ascending) / "Z–A" — not Oldest/Newest (see homeSortOrderOptions).
    await page
      .getByRole("group", { name: "Order" })
      .getByRole("button", { name: "A–Z" })
      .click()
    // A-Z ascending: Alpha first.
    await expect(cards(page).first()).toContainText("Alpha")
  })

  test("favorites star filters to favorited diagrams only", async ({
    page,
  }) => {
    // Favorite the first card via its star button.
    await cards(page)
      .first()
      .getByRole("button", { name: "Add to favorites" })
      .click()
    // The band's favorites star toggles the favorites-only scope.
    await page.getByRole("button", { name: "Show favorites only" }).click()
    await expect(cards(page)).toHaveCount(1)
  })
})

// ---------------------------------------------------------------------------
// 3b. "Last modified" sort (default) — the gallery sorts and labels on
//     lastModifiedAt, not a phantom "last viewed" timestamp.
// ---------------------------------------------------------------------------

test.describe("Home page — last modified sort", () => {
  test.beforeEach(async ({ page }) => {
    // Distinct modification times so order is unambiguous. Newest = Recent.
    await seedDiagrams(page, [
      { id: "old", title: "Older", lastModifiedAt: "2023-01-01T00:00:00.000Z" },
      {
        id: "mid",
        title: "Middle",
        lastModifiedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        id: "new",
        title: "Recent",
        lastModifiedAt: "2025-01-01T00:00:00.000Z",
      },
    ])
  })

  test("defaults to sorting by last modified, newest first", async ({
    page,
  }) => {
    // The default sort (Last modified · Newest first) is not active, so the
    // Refine button shows no count badge and the chip line stays hidden.
    await expect(page.getByLabel("Active filters")).toHaveCount(0)
    // Newest-modified card is first, oldest is last.
    await expect(cards(page).first()).toContainText("Recent")
    await expect(cards(page).last()).toContainText("Older")
  })

  test("switching to oldest-first reverses by last modified", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Refine" }).click()
    await page
      .getByRole("group", { name: "Order" })
      .getByRole("button", { name: "Oldest" })
      .click()
    await expect(cards(page).first()).toContainText("Older")
    await expect(cards(page).last()).toContainText("Recent")
  })
})

// ---------------------------------------------------------------------------
// 4. Infinite scroll (no "Load more" button — IntersectionObserver sentinel)
// ---------------------------------------------------------------------------

test.describe("Home page — infinite scroll", () => {
  test.beforeEach(async ({ page }) => {
    // INITIAL_VISIBLE_COUNT = 9; seed more so a second page exists.
    const diagrams = Array.from({ length: 14 }, (_, i) => ({
      id: `d${i + 1}`,
      title: `Diagram ${String(i + 1).padStart(2, "0")}`,
    }))
    await seedDiagrams(page, diagrams)
  })

  test("shows 9 cards initially with no 'Load more' button", async ({
    page,
  }) => {
    await expect(cards(page)).toHaveCount(9)
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0)
  })

  test("scrolling the gallery container reveals more cards", async ({
    page,
  }) => {
    await expect(cards(page)).toHaveCount(9)
    // Drive the IntersectionObserver by scrolling the .home-page-scrollbar
    // container to the bottom so the sentinel div enters the root margin.
    await page.evaluate(() => {
      const scroller = document.querySelector(".home-page-scrollbar")
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    })
    await expect(cards(page)).toHaveCount(14)
  })
})

// ---------------------------------------------------------------------------
// 5. Card actions (MUI <Menu>)
// ---------------------------------------------------------------------------

test.describe("Home page — diagram card actions", () => {
  test.beforeEach(async ({ page }) => {
    await seedDiagrams(page, [{ id: "card-test", title: "Card Test Diagram" }])
  })

  test("three-dot menu opens with Open / Duplicate / Share / Delete", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    const menu = page.getByRole("menu", { name: "Diagram actions" })
    await expect(
      menu.getByRole("menuitem", { name: "Open", exact: true })
    ).toBeVisible()
    await expect(
      menu.getByRole("menuitem", { name: "Duplicate" })
    ).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "Share" })).toBeVisible()
    await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeVisible()
  })

  test("'Open' navigates to the local editor", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page
      .getByRole("menu", { name: "Diagram actions" })
      .getByRole("menuitem", { name: "Open", exact: true })
      .click()
    await expect(page).toHaveURL(/\/local\/card-test$/)
  })

  test("'Duplicate' adds a new card", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("menuitem", { name: "Duplicate" }).click()
    await expect(cards(page)).toHaveCount(2)
  })

  test("'Delete' shows the confirm panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    const confirm = page.getByRole("alertdialog", {
      name: "Delete this diagram?",
    })
    await expect(confirm).toBeVisible()
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeVisible()
  })

  test("Cancel dismisses the confirm panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    const confirm = page.getByRole("alertdialog", {
      name: "Delete this diagram?",
    })
    await confirm.getByRole("button", { name: "Cancel" }).click()
    await expect(confirm).not.toBeVisible()
  })

  test("confirming Delete removes the card and shows the empty state", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("menuitem", { name: "Delete" }).click()
    // The confirm panel's own "Delete" button commits the deletion.
    await page
      .getByRole("alertdialog", { name: "Delete this diagram?" })
      .getByRole("button", { name: "Delete" })
      .click()
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText("No diagrams yet")).toBeVisible()
  })

  test("the card body is a link that opens the local editor", async ({
    page,
  }) => {
    const card = page.getByRole("link", { name: "Open Card Test Diagram" })
    // A real href so cmd/ctrl/middle-click opens a new tab.
    await expect(card).toHaveAttribute("href", /\/local\/card-test$/)
    await card.click()
    await expect(page).toHaveURL(/\/local\/card-test$/)
    // The browser tab is named after the diagram.
    await expect(page).toHaveTitle(/Card Test Diagram/)
  })
})

// ---------------------------------------------------------------------------
// 6. Accessibility basics
// ---------------------------------------------------------------------------

test.describe("Home page — accessibility basics", () => {
  test("search input has an accessible label", async ({ page }) => {
    await seedDiagrams(page, [{ id: "a11y-1", title: "A11y Diagram" }])
    await expect(
      page.getByRole("searchbox", { name: "Search diagrams by name" })
    ).toBeVisible()
  })

  test("the diagram grid exposes role=list", async ({ page }) => {
    await seedDiagrams(page, [{ id: "a11y-2", title: "Acc Test" }])
    await expect(page.locator('[role="list"]')).toBeAttached()
  })

  test("legal links are reachable via the Help menu on desktop", async ({
    page,
  }) => {
    await seedEmpty(page)
    // The footer was retired; the legal links + source attribution moved into
    // the shared Help menu in the home band (anchor-backed `role=menuitem`s, the
    // same body as the editor/mobile Help surfaces).
    await page.getByRole("button", { name: "Help" }).click()
    await expect(
      page.getByRole("menuitem", { name: "Imprint" })
    ).toHaveAttribute("href", "/imprint")
    await expect(
      page.getByRole("menuitem", { name: "Privacy" })
    ).toHaveAttribute("href", "/privacy")
    // OSS conventions (matching Artemis/Hephaestus): a Releases link and a
    // GitHub source attribution.
    await expect(
      page.getByRole("menuitem", { name: "Releases" })
    ).toHaveAttribute("href", /github\.com\/ls1intum\/Apollon\/releases$/)
    await expect(
      page.getByRole("menuitem", { name: "GitHub" })
    ).toHaveAttribute("href", "https://github.com/ls1intum/Apollon")
  })

  test("the About dialog shows app info and source links", async ({ page }) => {
    await seedEmpty(page)
    // About moved from the footer into the shared Help menu.
    await page.getByRole("button", { name: "Help" }).click()
    await page.getByRole("menuitem", { name: "About" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Information about Apollon")).toBeVisible()
    await expect(dialog.getByRole("link", { name: "GitHub" })).toBeVisible()
    await expect(
      dialog.getByRole("link", { name: "License (MIT)" })
    ).toBeVisible()
  })

  test("legal links are reachable via the Help menu on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 720 })
    await seedEmpty(page)
    await expect(page.getByRole("contentinfo")).toBeHidden()
    // On mobile the home band's actions pill surfaces a Help dropdown carrying
    // the shared Help/legal items (the same body as the desktop Help menu).
    await page.getByRole("button", { name: "Help" }).click()
    // The legal links are anchor-backed menu items (role=menuitem) inside the
    // Help dropdown — assert their hrefs.
    await expect(
      page.getByRole("menuitem", { name: "Imprint" })
    ).toHaveAttribute("href", "/imprint")
    await expect(
      page.getByRole("menuitem", { name: "Privacy" })
    ).toHaveAttribute("href", "/privacy")
  })
})

// ---------------------------------------------------------------------------
// 8. Sharing reflects in the gallery without a reload
// ---------------------------------------------------------------------------

test.describe("Home page — share reflects immediately", () => {
  const SHARED_ID = "shared-new-1"

  test("a newly shared diagram appears on the All view without reload", async ({
    page,
  }) => {
    // Mock the share API: POST creates the diagram, GET returns the stored copy.
    await page.route("**/api/diagrams", (route) => {
      if (route.request().method() !== "POST") return route.continue()
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: SHARED_ID,
          type: "ClassDiagram",
          title: "Sharable Diagram",
          nodes: [],
          edges: [],
          assessments: {},
          version: "4.0.0",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
      })
    })
    await page.route(`**/api/diagrams/${SHARED_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: SHARED_ID,
          type: "ClassDiagram",
          title: "Sharable Diagram",
          nodes: [],
          edges: [],
          assessments: {},
          version: "4.0.0",
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        }),
      })
    )

    await seedDiagrams(page, [{ id: "local-1", title: "Sharable Diagram" }])
    await expect(cards(page)).toHaveCount(1)

    // Open the card's actions menu and start sharing.
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("menuitem", { name: "Share" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: "Create" }).click()

    // The new shared copy must show up as a second card without any reload.
    await expect(cards(page)).toHaveCount(2)
    await expect(
      page.locator('[role="listitem"]').filter({ hasText: "Shared" })
    ).toHaveCount(1)
  })
})

// ---------------------------------------------------------------------------
// 9. Chrome routes (legal) show the home header, not editor controls
// ---------------------------------------------------------------------------

test.describe("Legal pages", () => {
  test("imprint shows the home header and links back to the diagrams", async ({
    page,
  }) => {
    await page.goto("/imprint")

    // Home header (logo link + theme toggle), not the editor File/Share navbar.
    await expect(page.getByRole("link", { name: "All diagrams" })).toBeVisible()
    await expect(page.getByRole("button", { name: "File" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Share" })).toHaveCount(0)

    await page.getByRole("link", { name: "All diagrams" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Your diagrams" })
    ).toBeVisible()
  })

  test("legal pages cross-link via the Help menu (imprint -> privacy)", async ({
    page,
  }) => {
    await page.goto("/imprint")
    // The sub-page chrome header (ChromeSubHeader) carries the same Help menu;
    // the footer is gone, so the imprint -> privacy hop goes through it.
    await page.getByRole("button", { name: "Help" }).click()
    await page.getByRole("menuitem", { name: "Privacy" }).click()
    await expect(page).toHaveURL(/\/privacy$/)
    // Still the chrome shell — not a dead end.
    await expect(page.getByRole("link", { name: "All diagrams" })).toBeVisible()
  })

  test("legal pages reach legal links via the Help menu on mobile", async ({
    page,
  }) => {
    // On mobile the sub-page ChromeSubHeader keeps the Help dropdown (icon-only
    // below lg) beside the Theme toggle; the shared Help menu carries the legal
    // links — there is room for both, so there is no "…" overflow.
    await page.setViewportSize({ width: 390, height: 720 })
    await page.goto("/imprint")
    await expect(page.getByRole("contentinfo")).toBeHidden()
    await page.getByRole("button", { name: "Help" }).click()
    await expect(
      page.getByRole("menuitem", { name: "Privacy" })
    ).toHaveAttribute("href", "/privacy")
  })

  test("keeps the sub-page chrome outside iPhone safe areas", async ({
    page,
  }) => {
    // ChromeSubHeader serves legal/404 sub-pages as a sticky island band inside
    // PageShell. It clears the notch two ways: the sticky band's `top` offset
    // adds the TOP inset, and the shared `.home-content-x` gutter hugs the
    // LEFT/RIGHT insets (max(edge, inset)). Headless Chromium reports 0 env()
    // insets, so simulate a notch via the custom properties production derives
    // from env() (webapp.css :root).
    const INSET = 47
    const LANDSCAPE_WIDTH = 844

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/imprint")
    // Wait for the chrome band to render before reading layout off it — the
    // evaluate() below queries the DOM directly and would otherwise race React.
    await expect(page.getByRole("banner")).toBeVisible()
    await page.evaluate((inset) => {
      document.documentElement.style.setProperty(
        "--safe-area-inset-top",
        `${inset}px`
      )
    }, INSET)

    // The band pins at `top: calc(safe-area-top + 0.75rem)`, so its resolved
    // sticky offset clears the top inset rather than tucking under the notch.
    const stickyTop = await page.evaluate(() => {
      const banner = document.querySelector('header[aria-label="Home"]')
      const sticky = banner?.parentElement
      return sticky ? getComputedStyle(sticky).top : null
    })
    expect(parseFloat(stickyTop ?? "0")).toBeGreaterThanOrEqual(INSET)

    await page.setViewportSize({ width: LANDSCAPE_WIDTH, height: 390 })
    await page.evaluate((inset) => {
      document.documentElement.style.setProperty("--safe-area-inset-top", "0px")
      document.documentElement.style.setProperty(
        "--safe-area-inset-left",
        `${inset}px`
      )
      document.documentElement.style.setProperty(
        "--safe-area-inset-right",
        `${inset}px`
      )
    }, INSET)

    // The chrome HUGS the safe area (max(edge, inset)): leading content sits at
    // the notch edge, never under it.
    const homeLinkBox = await page
      .getByRole("link", { name: "Apollon home" })
      .boundingBox()
    expect(homeLinkBox?.x).toBeGreaterThanOrEqual(INSET)

    // Trailing content (the theme switcher in the md+ actions island) ends
    // before the right inset.
    const themeButtonBox = await page
      .getByRole("button", { name: /Switch to (light|dark) mode/ })
      .boundingBox()
    expect(themeButtonBox).not.toBeNull()
    expect(themeButtonBox!.x + themeButtonBox!.width).toBeLessThanOrEqual(
      LANDSCAPE_WIDTH - INSET
    )
  })
})
