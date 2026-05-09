/**
 * SVG renderer implementations.
 *
 *   - `createWorkerSvgSource(resource)`: dispatches to the JSDOM-backed
 *     worker thread (shared between PDF + embed). Production default.
 *
 *   - `createInProcessSvgSource()`: calls `convertModelToSvg` +
 *     `sanitizeSvg` directly. Tests inject this via `AppDeps.svgSource`
 *     so they don't need the compiled worker `.js` artifact.
 *
 * Both implementations return DOMPurify-sanitised SVG (the worker
 * sanitises inside the thread via `renderSvgSafe`; the in-process
 * source sanitises inline). No environment-based selector — `buildApp`
 * picks the worker source by default and tests opt into in-process
 * explicitly.
 */

import type { UMLModel } from "@tumaet/apollon"
import type { ConversionResource } from "../resources/conversion-resource"
import type { SvgSource } from "./embed-preview"

export function createWorkerSvgSource(
  resource: ConversionResource
): SvgSource {
  return { render: (model: UMLModel) => resource.renderSvg(model) }
}

export function createInProcessSvgSource(): SvgSource {
  // Lazy import: `conversion-service` imports `global-jsdom/register`,
  // which polyfills DOM globals on load. We don't want those globals
  // landing in the production main thread, so the import is gated
  // behind this factory which production never calls.
  return {
    render: async (model: UMLModel) => {
      const { convertModelToSvg, sanitizeSvg } = await import(
        "./conversion-service"
      )
      const { svg, clip } = await convertModelToSvg(model)
      // Match the worker SVG path: sanitise before returning so embed
      // consumers receive clean output regardless of which source
      // produced it.
      return { svg: sanitizeSvg(svg), clip }
    },
  }
}

/**
 * Transitional helper used during the embed feature's first commit
 * before `buildApp` lifted the `EmbedPreviewService` to a per-app
 * singleton. The Loop 2 hardening commit refactors this away.
 *
 * Production gets a worker-backed source bound to a freshly-allocated
 * `ConversionResource` (one worker thread per call). Tests opt into
 * `createInProcessSvgSource()` explicitly.
 */
export function defaultSvgSource(): SvgSource {
  // Lazily resolve to avoid a circular import (conversion-resource ←
  // worker-thread → conversion-renderer → conversion-service).
  const { ConversionResource } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../resources/conversion-resource") as typeof import("../resources/conversion-resource")
  return createWorkerSvgSource(new ConversionResource())
}
