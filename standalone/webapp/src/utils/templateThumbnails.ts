import type { UMLModel } from "@tumaet/apollon"
import { renderThumbnailSvgFromModel } from "@/utils/thumbnailSvg"
import { waitForIdle } from "@/utils/idle"
import { log } from "@/logger"
import { prepareTemplateModel } from "@/utils/templateModels"

/**
 * Renders the bundled design-pattern templates to preview SVGs for the New
 * Diagram dialog, lazily and one at a time.
 *
 * Keyed by template NAME, never model.id: the shipped template JSONs
 * deliberately share ids (Adapter/Bridge/Command carry one, Observer/Factory
 * another), so an id-keyed cache — or routing these through the persistence
 * store — would collide and corrupt entries. These previews never touch the
 * store; they live only here for the page lifetime.
 *
 * A `string` value is a rendered light-mode SVG; `null` marks a permanent
 * render failure (so consumers stop waiting and show a fallback). `has(name)`
 * therefore means "resolved", success or failure.
 */
const templateSvgCache = new Map<string, string | null>()

type Listener = (name: string, lightSvg: string | null) => void
const listeners = new Set<Listener>()

const pendingQueue: string[] = []
const queuedNames = new Set<string>()
let workerActive = false

const importTemplateModel = async (name: string): Promise<UMLModel> => {
  // Same asset path the create flow uses; Vite resolves it at build time.
  const jsonModule = await import(`assets/diagramTemplates/${name}.json`)
  const jsonData = jsonModule.default
  if (!jsonData) {
    throw new Error(`Template "${name}" not found`)
  }
  return prepareTemplateModel(jsonData as UMLModel)
}

const notify = (name: string, lightSvg: string | null) => {
  for (const listener of listeners) {
    listener(name, lightSvg)
  }
}

const runWorker = async () => {
  if (workerActive) return
  workerActive = true

  // Each render mounts a hidden ApollonEditor, so render serially and yield to
  // idle between items rather than mounting all templates at once.
  while (pendingQueue.length > 0) {
    const name = pendingQueue.shift()
    if (!name) continue
    queuedNames.delete(name)
    if (templateSvgCache.has(name)) continue

    await waitForIdle()

    try {
      const model = await importTemplateModel(name)
      const svg = await renderThumbnailSvgFromModel(model)
      templateSvgCache.set(name, svg)
      notify(name, svg)
    } catch (error) {
      templateSvgCache.set(name, null)
      notify(name, null)
      log.error(`Failed to render template thumbnail "${name}"`, error as Error)
    }
  }

  workerActive = false
}

/** The resolved preview for a name: SVG string, `null` (failed), or `undefined` (not yet rendered). */
export const getResolvedTemplateSvg = (
  name: string
): string | null | undefined => templateSvgCache.get(name)

/** Queue a template for rendering (no-op if already resolved or queued). */
export const requestTemplateThumbnail = (name: string) => {
  if (templateSvgCache.has(name) || queuedNames.has(name)) return
  queuedNames.add(name)
  pendingQueue.push(name)
  void runWorker()
}

export const subscribeTemplateThumbnails = (
  listener: Listener
): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
