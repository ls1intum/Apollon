import { expect, test, type Page, type TestInfo } from "@playwright/test"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { clickFitView, waitForCanvasReady } from "../tests/helpers/canvas"
import { PERSISTENCE_STORE_VERSION } from "./seed-store-version.mjs"

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixtureDirectory = path.resolve(currentDirectory, "../tests/fixtures")
const screenshotFixtureDirectory = path.resolve(currentDirectory, "fixtures")
const outputDirectory = path.resolve(
  currentDirectory,
  "../fastlane/screenshots-preview/en-US"
)

function loadFixture(filename: string, directory: string = fixtureDirectory) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, filename), "utf8")
  ) as Record<string, unknown>
}

const hero = loadFixture("readme-hero.json")
const workflow = loadFixture(
  "order-fulfillment.json",
  screenshotFixtureDirectory
)
const platform = loadFixture(
  "apollon-platform.json",
  screenshotFixtureDirectory
)

function persistenceValue(
  fixtures: Array<Record<string, unknown>>,
  currentModelId: string | null = null
) {
  const timestamp = "2026-07-23T10:00:00.000Z"
  return JSON.stringify({
    state: {
      models: Object.fromEntries(
        fixtures.map((fixture, index) => [
          fixture.id,
          {
            id: fixture.id,
            model: fixture,
            createdAt: timestamp,
            lastModifiedAt: new Date(
              Date.parse(timestamp) + index * 60_000
            ).toISOString(),
            favorite: index === 0,
          },
        ])
      ),
      currentModelId,
    },
    version: PERSISTENCE_STORE_VERSION,
  })
}

async function seed(
  page: Page,
  testInfo: TestInfo,
  fixtures: Array<Record<string, unknown>>,
  currentModelId: string | null = null
) {
  const isPhone = testInfo.project.name.startsWith("iPhone")
  await page.addInitScript(
    ({ store, safeArea }) => {
      localStorage.setItem("persistenceModelStore", store)
      localStorage.setItem("apollon:safe-area-sim", JSON.stringify(safeArea))
    },
    {
      store: persistenceValue(fixtures, currentModelId),
      // Native builds hide the status bar, but the app still clears the
      // physical sensor/home-indicator areas.
      safeArea: isPhone ? [59, 0, 34, 0] : [24, 0, 20, 0],
    }
  )
}

async function capture(
  page: Page,
  testInfo: TestInfo,
  order: number,
  slug: string
) {
  await page.evaluate(() => document.fonts.ready)
  await page.mouse.move(0, 0)
  await page.waitForTimeout(800)

  const filename = `${testInfo.project.name}-${String(order).padStart(
    2,
    "0"
  )}-${slug}.png`
  await page.screenshot({
    path: path.join(outputDirectory, filename),
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    scale: "device",
  })
}

async function openEditor(
  page: Page,
  testInfo: TestInfo,
  fixture: Record<string, unknown>
) {
  await seed(page, testInfo, [fixture], fixture.id as string)
  await page.goto(`/local/${fixture.id as string}`)
  await waitForCanvasReady(page)
  await clickFitView(page)
}

test("01 — local diagram dashboard", async ({ page }, testInfo) => {
  await seed(page, testInfo, [workflow, platform, hero])
  await page.goto("/")

  await expect(
    page.getByRole("heading", { level: 1, name: "Your diagrams" })
  ).toBeVisible()
  await expect(page.locator('[role="listitem"]')).toHaveCount(3)
  await expect(page.getByAltText("Apollon diagram preview")).toBeVisible({
    timeout: 20_000,
  })
  await capture(page, testInfo, 1, "your-diagrams")
})

test("02 — class diagram editor", async ({ page }, testInfo) => {
  await openEditor(page, testInfo, hero)
  await capture(page, testInfo, 2, "class-diagram")
})

test("03 — diagram and template choices", async ({ page }, testInfo) => {
  await seed(page, testInfo, [workflow, platform, hero])
  await page.goto("/")
  await page.getByRole("button", { name: "New diagram" }).first().click()

  const dialog = page.getByRole("dialog", { name: "New Diagram" })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Class Diagram", exact: true })
  ).toBeVisible()
  await capture(page, testInfo, 3, "diagram-types")
})

test("04 — export formats", async ({ page }, testInfo) => {
  await openEditor(page, testInfo, platform)
  await page.getByRole("button", { name: "File" }).click()

  const menu = page.getByRole("menu", { name: "File" })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole("menuitem", { name: "As PPTX" })).toBeVisible()
  await capture(page, testInfo, 4, "export-formats")
})

test("05 — dark appearance", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await openEditor(page, testInfo, workflow)
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await capture(page, testInfo, 5, "dark-mode")
})
