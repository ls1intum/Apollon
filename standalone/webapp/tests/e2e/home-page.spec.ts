import { test, expect, type Page } from "@playwright/test"

// ---------------------------------------------------------------------------
// Seed helper
// ---------------------------------------------------------------------------

async function seedDiagrams(
  page: Page,
  diagrams: Array<{
    id: string
    title: string
    type?: string
    lastModifiedAt?: string
  }>
) {
  const models: Record<string, unknown> = {}
  for (const d of diagrams) {
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
      lastModifiedAt: d.lastModifiedAt ?? new Date().toISOString(),
    }
  }
  await page.goto("/")
  await page.evaluate(
    (storeValue) => {
      localStorage.setItem("persistenceModelStore", storeValue)
    },
    JSON.stringify({ state: { models, currentModelId: null }, version: 1 })
  )
  await page.goto("/")
  await page.waitForLoadState("networkidle")
  // DiagramGallery is lazy-loaded; wait for it to render with seeded data
  await page.locator('[role="list"]').waitFor({ timeout: 10_000 })
}

// ---------------------------------------------------------------------------
// 1. Initial load
// ---------------------------------------------------------------------------

test.describe("Home page — initial load", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("renders the hero section with headline and CTA buttons", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Model architecture clearly"
    )
    await expect(
      page.getByRole("button", { name: "Create New Diagram" })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Browse Templates" })
    ).toBeVisible()
  })

  test("shows HomeNavbar with theme toggle", async ({ page }) => {
    const header = page.locator("header").first()
    await expect(header).toBeVisible()
    // ThemeSwitcherMenu renders a plain <button> with a Sun/Moon icon SVG
    const themeToggle = header.locator("button").first()
    await expect(themeToggle).toBeVisible()
  })

  test("does not show the editor Navbar", async ({ page }) => {
    await expect(page.locator("#file-menu-button")).toHaveCount(0)
  })

  test("desktop section nav is visible with three items", async ({ page }) => {
    // The sticky section nav is a <section> that contains a <ul> with three <li><button>
    // It is hidden on mobile (md:block) — default viewport 1280×720 shows it
    const stickyNav = page.locator("section").filter({
      has: page.locator("ul"),
    })
    const newDiagramBtn = stickyNav.getByRole("button", { name: "New Diagram" })
    const templatesBtn = stickyNav.getByRole("button", { name: "Templates" })
    const recentsBtn = stickyNav.getByRole("button", { name: "Recents" })
    await expect(newDiagramBtn.first()).toBeVisible()
    await expect(templatesBtn.first()).toBeVisible()
    await expect(recentsBtn.first()).toBeVisible()
  })

  test("mobile bottom nav is visible at mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    const mobileNav = page.locator('nav[aria-label="Page sections"]')
    await expect(mobileNav).toBeVisible()
    await expect(
      mobileNav.getByRole("button", { name: "New Diagram" })
    ).toBeVisible()
    await expect(
      mobileNav.getByRole("button", { name: "Templates" })
    ).toBeVisible()
    await expect(
      mobileNav.getByRole("button", { name: "Recents" })
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 2. Empty state
// ---------------------------------------------------------------------------

test.describe("Home page — empty state (no diagrams)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
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
    await page.waitForLoadState("networkidle")
  })

  test("shows 'No diagrams yet' empty state in recent diagrams section", async ({
    page,
  }) => {
    await expect(page.getByText("No diagrams yet")).toBeVisible()
  })

  test("shows 'Create your first diagram' button in empty state", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Create your first diagram" })
    ).toBeVisible()
  })

  test("'Create your first diagram' scrolls to the diagram type section", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "Create your first diagram" })
      .click()
    await page.waitForTimeout(600)
    await expect(page.locator("#new-diagram-section")).toBeInViewport()
  })
})

// ---------------------------------------------------------------------------
// 3. Diagram gallery with diagrams
// ---------------------------------------------------------------------------

test.describe("Home page — diagram gallery", () => {
  test.beforeEach(async ({ page }) => {
    await seedDiagrams(page, [
      { id: "d1", title: "Alpha" },
      { id: "d2", title: "Beta" },
      { id: "d3", title: "Gamma" },
    ])
  })

  test("shows all seeded diagrams as cards", async ({ page }) => {
    const cards = page.locator('[role="listitem"]')
    await expect(cards).toHaveCount(3)
  })

  test("first card has 'Most Recent' badge", async ({ page }) => {
    const firstCard = page.locator('[role="listitem"]').first()
    await expect(firstCard).toContainText("Most Recent")
  })

  test("shows the correct diagram count badge", async ({ page }) => {
    // The count badge is a <span> near the "Recent Diagrams" heading
    const countBadge = page
      .locator("h3", { hasText: "Recent Diagrams" })
      .locator("..")
      .getByText("3")
    await expect(countBadge).toBeVisible()
  })

  test("search filters cards by title", async ({ page }) => {
    await page.locator("#recent-diagrams-search").fill("Alpha")
    const cards = page.locator('[role="listitem"]')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toContainText("Alpha")
  })

  test("clearing search restores all cards", async ({ page }) => {
    const searchInput = page.locator("#recent-diagrams-search")
    await searchInput.fill("Alpha")
    await expect(page.locator('[role="listitem"]')).toHaveCount(1)
    await searchInput.fill("")
    await expect(page.locator('[role="listitem"]')).toHaveCount(3)
  })

  test("type filter chip appears for ClassDiagram", async ({ page }) => {
    // exact: true — the tile button in DiagramTypeGrid has a longer accessible
    // name ("Class Diagram Model classes…"); the filter chip is exactly "Class Diagram"
    await expect(
      page.getByRole("button", { name: "Class Diagram", exact: true })
    ).toBeVisible()
  })

  test("clicking a type filter chip shows only matching diagrams", async ({
    page,
  }) => {
    // All 3 are ClassDiagram — clicking the chip keeps all 3 visible
    const chip = page.getByRole("button", {
      name: "Class Diagram",
      exact: true,
    })
    await chip.click()
    await expect(page.locator('[role="listitem"]')).toHaveCount(3)
    // Active chip has the accent shadow class
    await expect(chip).toHaveClass(/shadow-\[inset/)
  })

  test("no-match search shows 'No diagrams match' message", async ({
    page,
  }) => {
    await page.locator("#recent-diagrams-search").fill("zzz-no-match")
    await expect(
      page.getByText("No diagrams match your search and filters.")
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 4. Load more
// ---------------------------------------------------------------------------

test.describe("Home page — load more", () => {
  test.beforeEach(async ({ page }) => {
    const diagrams = Array.from({ length: 10 }, (_, i) => ({
      id: `d${i + 1}`,
      title: `Diagram ${i + 1}`,
    }))
    await seedDiagrams(page, diagrams)
  })

  test("shows 9 cards initially and a 'Load more' button", async ({ page }) => {
    await expect(page.locator('[role="listitem"]')).toHaveCount(9)
    await expect(page.getByRole("button", { name: "Load more" })).toBeVisible()
  })

  test("'Load more' reveals the remaining cards", async ({ page }) => {
    await page.getByRole("button", { name: "Load more" }).click()
    await expect(page.locator('[role="listitem"]')).toHaveCount(10)
    await expect(
      page.getByRole("button", { name: "Load more" })
    ).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 5. Diagram card actions
// ---------------------------------------------------------------------------

test.describe("Home page — diagram card actions", () => {
  test.beforeEach(async ({ page }) => {
    await seedDiagrams(page, [{ id: "card-test", title: "Card Test Diagram" }])
  })

  test("three-dot menu opens action dropdown", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    // Scope to the dropdown panel to avoid matching the card body button
    const dropdown = page.locator(".absolute.right-0.z-40.mt-2")
    await expect(
      dropdown.getByRole("button", { name: "Open", exact: true })
    ).toBeVisible()
    await expect(
      dropdown.getByRole("button", { name: "Duplicate", exact: true })
    ).toBeVisible()
    await expect(
      dropdown.getByRole("button", { name: "Delete", exact: true })
    ).toBeVisible()
  })

  test("clicking 'Open' navigates to the editor", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    const dropdown = page.locator(".absolute.right-0.z-40.mt-2")
    await dropdown.getByRole("button", { name: "Open", exact: true }).click()
    await expect(page).toHaveURL(/\/local\/card-test$/)
  })

  test("clicking 'Duplicate' creates a new card", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("button", { name: "Duplicate" }).click()
    await expect(page.locator('[role="listitem"]')).toHaveCount(2)
  })

  test("Delete shows confirm panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("button", { name: "Delete" }).click()
    await expect(page.getByText("Delete this diagram?")).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
  })

  test("Cancel dismisses the confirm panel", async ({ page }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    await page.getByRole("button", { name: "Delete" }).click()
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByText("Delete this diagram?")).not.toBeVisible()
  })

  test("confirming Delete removes the card and shows empty state", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Open diagram actions" }).click()
    // First "Delete" opens the confirm panel
    await page.getByRole("button", { name: "Delete" }).click()
    // The confirm "Delete" button is inside the confirm panel — scope to it
    const confirmPanel = page.locator(".space-y-2.rounded-md.border")
    await confirmPanel.getByRole("button", { name: "Delete" }).click()
    await expect(page.locator('[role="listitem"]')).toHaveCount(0)
    await expect(page.getByText("No diagrams yet")).toBeVisible()
  })

  test("clicking card body navigates to the editor", async ({ page }) => {
    await page.getByRole("button", { name: "Open Card Test Diagram" }).click()
    await expect(page).toHaveURL(/\/local\/card-test$/)
  })
})

// ---------------------------------------------------------------------------
// 6. Template section
// ---------------------------------------------------------------------------

test.describe("Home page — template section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("template section is present with all 5 templates", async ({ page }) => {
    // Scroll the <main> scroll container to the template section
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll("h2")).find((el) =>
        el.textContent?.includes("2. Start from Template")
      )
      heading?.scrollIntoView({ block: "start" })
    })
    await page.waitForTimeout(300)
    for (const name of [
      "Adapter",
      "Bridge",
      "Command",
      "Observer",
      "Factory",
    ]) {
      // getByRole accessible name includes full subtree text; scope via <p> child instead
      const btn = page.locator("button").filter({
        has: page.locator("p", { hasText: new RegExp(`^${name}$`) }),
      })
      await expect(btn).toBeVisible()
    }
  })

  test("each template card shows its category badge", async ({ page }) => {
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll("h2")).find((el) =>
        el.textContent?.includes("2. Start from Template")
      )
      heading?.scrollIntoView({ block: "start" })
    })
    await page.waitForTimeout(300)
    await expect(page.getByText("Structural").first()).toBeVisible()
    await expect(page.getByText("Behavioral").first()).toBeVisible()
    await expect(page.getByText("Creational").first()).toBeVisible()
  })

  test("clicking a template navigates to the editor with a new diagram id", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll("h2")).find((el) =>
        el.textContent?.includes("2. Start from Template")
      )
      heading?.scrollIntoView({ block: "start" })
    })
    await page.waitForTimeout(300)
    await page
      .locator("button")
      .filter({ has: page.locator("p", { hasText: /^Adapter$/ }) })
      .click()
    await page.waitForURL(/\/local\/.+/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/local\/.+/)
  })
})

// ---------------------------------------------------------------------------
// 7. New diagram section (diagram type grid)
// ---------------------------------------------------------------------------

test.describe("Home page — new diagram section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("diagram type grid section exists with heading", async ({ page }) => {
    await page.evaluate(() => {
      document
        .getElementById("new-diagram-section")
        ?.scrollIntoView({ block: "start" })
    })
    await page.waitForTimeout(300)
    await expect(
      page.getByRole("heading", { name: "1. Create New Diagram" })
    ).toBeVisible()
  })

  test("clicking a diagram type creates a new diagram and navigates to editor", async ({
    page,
  }) => {
    await page.evaluate(() => {
      document
        .getElementById("new-diagram-section")
        ?.scrollIntoView({ block: "start" })
    })
    await page.waitForTimeout(300)
    const section = page.locator("#new-diagram-section")
    const firstTileButton = section.getByRole("button").first()
    await firstTileButton.click()
    await page.waitForURL(/\/local\/.+/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/local\/.+/)
  })
})

// ---------------------------------------------------------------------------
// 8. Hero CTA buttons
// ---------------------------------------------------------------------------

test.describe("Home page — hero CTA buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("'Create New Diagram' scrolls to the new diagram section", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Create New Diagram" }).click()
    await page.waitForTimeout(600)
    await expect(page.locator("#new-diagram-section")).toBeInViewport()
  })

  test("'Browse Templates' scrolls to the template section", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Browse Templates" }).click()
    await page.waitForTimeout(600)
    await expect(
      page.getByRole("heading", { name: "2. Start from Template" })
    ).toBeInViewport()
  })
})

// ---------------------------------------------------------------------------
// 9. Accessibility basics
// ---------------------------------------------------------------------------

test.describe("Home page — accessibility basics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")
  })

  test("search input has a label", async ({ page }) => {
    const label = page.locator('label[for="recent-diagrams-search"]')
    await expect(label).toBeAttached()
  })

  test("diagram cards list has role=list", async ({ page }) => {
    // Seed a diagram so the gallery renders
    await page.evaluate(() => {
      localStorage.setItem(
        "persistenceModelStore",
        JSON.stringify({
          state: {
            models: {
              acc1: {
                id: "acc1",
                model: {
                  id: "acc1",
                  type: "ClassDiagram",
                  title: "Acc Test",
                  nodes: [],
                  edges: [],
                  assessments: {},
                  version: "4.0.0",
                },
                lastModifiedAt: new Date().toISOString(),
              },
            },
            currentModelId: null,
          },
          version: 1,
        })
      )
    })
    await page.reload()
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[role="list"]')).toBeAttached()
  })

  test("mobile nav has aria-label", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.locator('nav[aria-label="Page sections"]')).toBeAttached()
  })
})
