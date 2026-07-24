import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const appDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const fixturesDirectory = path.join(appDirectory, "tests", "fixtures")
const screenshotFixturesDirectory = path.join(
  appDirectory,
  "app-store-screenshots",
  "fixtures"
)
const indexPath = path.join(appDirectory, "dist", "index.html")

const loadFixture = (directory, filename, id, title) => ({
  ...JSON.parse(fs.readFileSync(path.join(directory, filename), "utf8")),
  id,
  title,
})

// readme-hero.json is the exact fixture used by the repository's Playwright
// README-asset visual test. These records are injected only into the temporary
// screenshot build in dist/; they are not templates or release data.
const fixtures = [
  loadFixture(
    screenshotFixturesDirectory,
    "order-fulfillment.json",
    "app-store-workflow",
    "Order Fulfillment"
  ),
  loadFixture(
    screenshotFixturesDirectory,
    "apollon-platform.json",
    "app-store-platform",
    "Apollon Platform"
  ),
  loadFixture(
    fixturesDirectory,
    "readme-hero.json",
    "fixture-readme-hero-001",
    "Apollon"
  ),
]
const timestamp = Date.parse("2026-07-23T10:00:00.000Z")
const models = Object.fromEntries(
  fixtures.map((fixture, index) => {
    const persistedAt = new Date(timestamp + index * 60_000).toISOString()
    return [
      fixture.id,
      {
        id: fixture.id,
        model: fixture,
        createdAt: persistedAt,
        lastModifiedAt: persistedAt,
        favorite: index === fixtures.length - 1,
      },
    ]
  })
)
const store = JSON.stringify({
  state: {
    models,
    currentModelId: null,
  },
  version: 3,
})
const seedScript = `<script data-app-store-screenshot-seed>localStorage.setItem("persistenceModelStore", ${JSON.stringify(store)});</script>`

const indexHtml = fs.readFileSync(indexPath, "utf8")
if (!indexHtml.includes("</head>")) {
  throw new Error(`Could not find </head> in ${indexPath}`)
}
if (indexHtml.includes("data-app-store-screenshot-seed")) {
  throw new Error(`Screenshot seed is already present in ${indexPath}`)
}

fs.writeFileSync(
  indexPath,
  indexHtml.replace("</head>", `${seedScript}</head>`)
)
