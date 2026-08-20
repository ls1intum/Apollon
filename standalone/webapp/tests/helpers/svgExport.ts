import type { Page } from "@playwright/test"
import { readFile } from "node:fs/promises"

/**
 * Download the compat SVG through the same public UI/API path users exercise.
 * Keeping visual tests on the production exporter prevents the test helper from
 * becoming a second, subtly different implementation of the export pipeline.
 */
export async function extractSVGFromPage(page: Page): Promise<string> {
  await page.getByRole("button", { name: "File" }).click()
  const downloadPromise = page.waitForEvent("download")
  await page.getByRole("menuitem", { name: "As SVG" }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  if (!downloadPath) throw new Error("SVG export did not produce a file")
  return readFile(downloadPath, "utf8")
}
