import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview"
import { setProjectAnnotations } from "@storybook/react-vite"
import { afterEach, beforeAll } from "vitest"
import * as preview from "./preview"

// Apply the right configuration when running stories as portable tests.
// https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const project = setProjectAnnotations([a11yAddonAnnotations, preview])

beforeAll(project.beforeAll)

// Cross-story portal hygiene. The portable-stories Vitest runner shares ONE
// document.body across every story in a worker, and Base UI portals its overlays
// to document.body. If an interaction story finishes with a menu/dialog/select
// still open, that portalled node can linger and capture role-queries in the
// next story — a flake that only surfaces in full-suite runs, never in
// isolation. Press Escape after each story so Base UI closes any open overlay
// the React-managed way (do NOT remove the node directly — React owns the portal
// and a manual removeChild would corrupt its teardown).
afterEach(() => {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  )
})
