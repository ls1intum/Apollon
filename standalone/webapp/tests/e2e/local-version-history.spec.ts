import { test, expect, type Page } from "@playwright/test"
import { waitForCanvasReady } from "../helpers/canvas"

/**
 * E2E coverage for issue #670 — local-mode version history, updated for the
 * post-#662 routing where `/` is the diagram gallery and the local editor
 * lives at `/local/:id`.
 *
 * Runs against real Chromium so we exercise actual IndexedDB (the unit suite
 * uses fake-indexeddb). Server-down by design: local mode never touches the
 * network.
 *
 * Covers the high-value journeys that the #662 merge put at risk:
 *   - Version-history button is visible on /local/:id and opens the drawer
 *   - "Save version" commits a row that survives reload (URL stays on
 *     /local/:id; the row is read back from IndexedDB)
 *   - Save is disabled on an empty diagram
 *   - Permalink ("Copy link") menu entry is hidden in local mode
 *   - Previewing a saved version overlays the read-only banner, and exiting
 *     returns to the editable composer
 *   - Opening from the gallery lands on /local/:id with a working drawer
 *   - /local/:unknown renders the not-found page back to the gallery
 *
 * The restore flow (auto-snapshot "Before restoring …" row, confirm-when-dirty
 * modal) is covered exhaustively by the unit suite
 * (services/versionRepository/__tests__/LocalVersionRepository.test.ts) since
 * it depends on structural-fingerprint divergence that is awkward to drive
 * reliably through the canvas in a browser.
 */

const LOCAL_ID = "local-test-uuid"

const LOCAL_FIXTURE = {
  id: LOCAL_ID,
  version: "4.0.0",
  title: "E2E Local",
  type: "ClassDiagram",
  nodes: [
    {
      id: "n1",
      type: "Class",
      width: 160,
      height: 80,
      position: { x: 0, y: 0 },
      data: { name: "ClassA" },
      measured: { width: 160, height: 80 },
    },
  ],
  edges: [],
  assessments: {},
}

/**
 * Seed a single local diagram into the persistence store (matching the
 * post-#662 PersistentModelEntity shape with createdAt/favorite) BEFORE the
 * first navigation. `addInitScript` runs on every load incl. reload, so the
 * row is stable across the test.
 */
function seedLocalDiagram(
  page: Page,
  model: Record<string, unknown> = LOCAL_FIXTURE
) {
  const now = new Date().toISOString()
  const storeValue = JSON.stringify({
    state: {
      models: {
        [model.id as string]: {
          id: model.id,
          model,
          lastModifiedAt: now,
          createdAt: now,
          favorite: false,
        },
      },
      currentModelId: null,
    },
    version: 1,
  })
  return page.addInitScript((val) => {
    localStorage.setItem("persistenceModelStore", val)
  }, storeValue)
}

const historyButton = (page: Page) =>
  page.getByRole("button", { name: /Version history/i })
const drawer = (page: Page) =>
  page.getByRole("complementary", { name: /Version history/i })
const composer = (page: Page) =>
  page.getByRole("textbox", { name: /Describe this version/i })
const saveVersionButton = (page: Page) =>
  page.getByRole("button", { name: "Save version", exact: true })

/**
 * Open the version drawer idempotently. `drawerOpenByDiagram` is persisted by
 * the version store, so after a reload the drawer is ALREADY open — clicking
 * the toggle again would close it. Only click when it isn't visible yet.
 */
async function ensureDrawerOpen(page: Page) {
  if (!(await drawer(page).isVisible())) {
    await historyButton(page).click()
  }
  await expect(drawer(page)).toBeVisible()
}

async function openLocalEditor(page: Page, id = LOCAL_ID) {
  await page.goto(`/local/${id}`)
  await waitForCanvasReady(page)
}

/**
 * Wait until the version write has actually COMMITTED to IndexedDB (not just
 * the optimistic store row). `createVersion` renders the row before its
 * awaited IDB transaction resolves, so a reload fired off the optimistic row
 * could race the commit. Polling real IDB both removes that flake and proves
 * the version is durably persisted.
 */
async function waitForVersionsPersisted(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          (dbName) =>
            new Promise<number>((resolve) => {
              const req = indexedDB.open(dbName)
              req.onsuccess = () => {
                const db = req.result
                if (!db.objectStoreNames.contains("versions")) {
                  db.close()
                  resolve(0)
                  return
                }
                const countReq = db
                  .transaction("versions", "readonly")
                  .objectStore("versions")
                  .count()
                countReq.onsuccess = () => {
                  resolve(countReq.result)
                  db.close()
                }
                countReq.onerror = () => {
                  resolve(0)
                  db.close()
                }
              }
              req.onerror = () => resolve(0)
            }),
          "apollon-versions"
        ),
      { timeout: 10_000 }
    )
    .toBeGreaterThan(0)
}

test.describe("Local version history (#670, /local/:id routing)", () => {
  // No IDB wipe needed: Playwright gives each test an isolated browser
  // context, so `apollon-versions` starts empty. (A reload-surviving wipe via
  // addInitScript is actively harmful — it re-runs on page.reload() and erases
  // the row the persistence test is verifying.)

  test("history button is visible on /local/:id and opens the drawer", async ({
    page,
  }) => {
    await seedLocalDiagram(page)
    await openLocalEditor(page)

    await expect(historyButton(page)).toBeVisible()
    await ensureDrawerOpen(page)

    // Local-specific empty-state CTA.
    await expect(
      page.getByRole("button", { name: /Save first version/i })
    ).toBeVisible()
  })

  test("'Save first version' saves the first version", async ({ page }) => {
    await seedLocalDiagram(page)
    await openLocalEditor(page)

    await ensureDrawerOpen(page)
    // The empty-state CTA commits the first version directly (not just focus
    // the composer): the empty state is replaced by a version row.
    await page.getByRole("button", { name: /Save first version/i }).click()
    await expect(
      page.getByRole("button", { name: /Save first version/i })
    ).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: /Version actions/i })
    ).toBeVisible()
  })

  test("save commits a row that survives reload", async ({ page }) => {
    await seedLocalDiagram(page)
    await openLocalEditor(page)

    await ensureDrawerOpen(page)
    await composer(page).fill("v1: initial")
    await saveVersionButton(page).click()
    await expect(page.getByText("v1: initial").first()).toBeVisible()

    // Reload — the row must be read back from IndexedDB. URL stays /local/:id.
    // Wait for the IDB commit first so the reload doesn't race the write.
    await waitForVersionsPersisted(page)
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/local/${LOCAL_ID}$`))
    await waitForCanvasReady(page)
    await ensureDrawerOpen(page)
    await expect(page.getByText("v1: initial").first()).toBeVisible()
  })

  test("save is disabled on an empty diagram", async ({ page }) => {
    await seedLocalDiagram(page, { ...LOCAL_FIXTURE, nodes: [], edges: [] })
    await page.goto(`/local/${LOCAL_ID}`)
    await waitForCanvasReady(page, false)

    await ensureDrawerOpen(page)
    await expect(saveVersionButton(page)).toBeDisabled()
  })

  test("permalink menu entry is absent in local mode", async ({ page }) => {
    await seedLocalDiagram(page)
    await openLocalEditor(page)

    await ensureDrawerOpen(page)
    await composer(page).fill("v1")
    await saveVersionButton(page).click()
    await expect(page.getByText("v1", { exact: true }).first()).toBeVisible()

    await page.getByRole("button", { name: /Version actions/i }).click()
    await expect(
      page.getByRole("menuitem", { name: /Copy link/i })
    ).toHaveCount(0)
  })

  test("previewing a saved version overlays the banner, and exit restores the composer", async ({
    page,
  }) => {
    await seedLocalDiagram(page)
    await openLocalEditor(page)

    await ensureDrawerOpen(page)
    await composer(page).fill("snapshot one")
    await saveVersionButton(page).click()
    await expect(page.getByText("snapshot one").first()).toBeVisible()

    // Clicking a saved row enters read-only preview — the banner's "Exit
    // preview" affordance appears and the composer is hidden. The row is a
    // stretched-link card (like the gallery cards): its overlay <a> owns the
    // click and intercepts pointer events over the bare text, so target the link.
    await page
      .getByRole("link", { name: /snapshot one/i })
      .first()
      .click()
    const exitPreview = page.getByRole("button", { name: /Exit preview/i })
    await expect(exitPreview).toBeVisible()
    await expect(composer(page)).toHaveCount(0)

    // Exiting preview returns to the editable composer.
    await exitPreview.click()
    await expect(exitPreview).toHaveCount(0)
    await expect(composer(page)).toBeVisible()
  })

  test("preview is in the URL: survives reload, Back exits it", async ({
    page,
  }) => {
    await seedLocalDiagram(page)
    await openLocalEditor(page)
    await ensureDrawerOpen(page)
    await composer(page).fill("milestone")
    await saveVersionButton(page).click()
    await expect(page.getByText("milestone").first()).toBeVisible()

    // Clicking a row writes ?version=<id> (the source of truth). The row's
    // stretched-link <a> owns the click, so target the link, not the bare text.
    await page
      .getByRole("link", { name: /milestone/i })
      .first()
      .click()
    await expect(page).toHaveURL(/[?&]version=/)
    await expect(
      page.getByRole("button", { name: /Exit preview/i })
    ).toBeVisible()

    // Reload re-enters preview from the URL (in-memory preview would be lost).
    await page.reload()
    await waitForCanvasReady(page)
    await expect(page).toHaveURL(/[?&]version=/)
    await expect(
      page.getByRole("button", { name: /Exit preview/i })
    ).toBeVisible()

    // A single Back exits preview (push-once-on-enter) and drops the param.
    await page.goBack()
    await expect(page).not.toHaveURL(/[?&]version=/)
    await expect(
      page.getByRole("button", { name: /Exit preview/i })
    ).toHaveCount(0)
  })

  test("deep link to ?version=<unknown> fails soft (toast, strips param, live canvas)", async ({
    page,
  }) => {
    await seedLocalDiagram(page)
    await page.goto(`/local/${LOCAL_ID}?version=does-not-exist`)
    await waitForCanvasReady(page)
    // Never crashes into preview; the bad param is stripped and we land live.
    await expect(
      page.getByRole("button", { name: /Exit preview/i })
    ).toHaveCount(0)
    await expect(page).not.toHaveURL(/[?&]version=/)
  })

  test("a preview does NOT leak across client-side navigation", async ({
    page,
  }) => {
    // Regression: `store.preview` is global. Previewing in one editor then
    // navigating (client-side, no full reload) to another editor with no
    // ?version= must NOT carry the banner over — the URL is the source of truth.
    await seedLocalDiagram(page)
    await openLocalEditor(page)
    await ensureDrawerOpen(page)
    await composer(page).fill("v1")
    await saveVersionButton(page).click()
    // Target the row's stretched-link <a> (it intercepts clicks over the text).
    await page.getByRole("link", { name: /— v1$/i }).first().click()
    await expect(page).toHaveURL(/[?&]version=/)
    await expect(
      page.getByRole("button", { name: /Exit preview/i })
    ).toBeVisible()

    // Client-side nav to the gallery (no full reload — the store survives)...
    await page
      .getByRole("banner")
      .getByRole("link", { name: /All diagrams/i })
      .click()
    await expect(page).toHaveURL(/\/$/)
    // ...then re-open the same diagram with NO version param.
    await page.getByRole("link", { name: /Open E2E Local/i }).click()
    await expect(page).toHaveURL(new RegExp(`/local/${LOCAL_ID}$`))
    await waitForCanvasReady(page)

    // The stale preview must be gone — no banner, no leftover param.
    await expect(
      page.getByRole("button", { name: /Exit preview/i })
    ).toHaveCount(0)
    await expect(page).not.toHaveURL(/[?&]version=/)
  })

  test("opening from the gallery lands on /local/:id with a working drawer", async ({
    page,
  }) => {
    await seedLocalDiagram(page)
    await page.goto("/")
    // Open the card -> local editor.
    await page.getByRole("link", { name: /Open E2E Local/i }).click()
    await expect(page).toHaveURL(new RegExp(`/local/${LOCAL_ID}$`))
    await waitForCanvasReady(page)

    await expect(historyButton(page)).toBeVisible()
    await ensureDrawerOpen(page)
  })

  test("/local/:unknown shows the not-found page back to the gallery", async ({
    page,
  }) => {
    await seedLocalDiagram(page)
    await page.goto("/local/does-not-exist")

    await expect(page.getByText(/Diagram not found/i)).toBeVisible()
    // Scope to the page body — the editor navbar's BackNav also has an "All
    // diagrams" link, so the bare role query is ambiguous.
    const back = page
      .getByTestId("editor-area")
      .getByRole("link", { name: /All diagrams/i })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/$/)
  })

  test("deleting the diagram in another window stops this one (no resurrection)", async ({
    context,
  }) => {
    // Two windows of the SAME diagram share one origin's localStorage, so the
    // `storage` event fires across them.
    const now = new Date().toISOString()
    await context.addInitScript(
      ([id, ts]) => {
        localStorage.setItem(
          "persistenceModelStore",
          JSON.stringify({
            state: {
              models: {
                [id]: {
                  id,
                  model: {
                    id,
                    version: "4.0.0",
                    title: "E2E Local",
                    type: "ClassDiagram",
                    nodes: [],
                    edges: [],
                    assessments: {},
                  },
                  lastModifiedAt: ts,
                  createdAt: ts,
                  favorite: false,
                },
              },
              currentModelId: null,
            },
            version: 1,
          })
        )
      },
      [LOCAL_ID, now]
    )

    const editorWin = await context.newPage()
    await editorWin.goto(`/local/${LOCAL_ID}`)
    await waitForCanvasReady(editorWin, false)

    // Second window deletes the diagram from the gallery.
    const galleryWin = await context.newPage()
    await galleryWin.goto("/")
    await galleryWin
      .getByRole("button", { name: "Open diagram actions" })
      .click()
    await galleryWin.getByRole("menuitem", { name: "Delete" }).click()
    await galleryWin
      .getByRole("alertdialog", { name: "Delete this diagram?" })
      .getByRole("button", { name: "Delete" })
      .click()

    // The editor window reconciles to the deletion (not-found view), instead of
    // continuing to autosave and resurrecting the diagram.
    await expect(editorWin.getByText(/Diagram not found/i)).toBeVisible({
      timeout: 10_000,
    })
  })
})
