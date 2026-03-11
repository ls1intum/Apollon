/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs"
import path from "path"
import { chromium, Browser, Route } from "playwright"
import { log } from "../logger"

export type ExportModel = {
  id: string
  version: string
  title: string
  type: string
  nodes: unknown[]
  edges: unknown[]
  assessments: Record<string, unknown>
}

type SvgResult = {
  svg: string
  clip: {
    x: number
    y: number
    width: number
    height: number
  }
}

type RasterizedResult = {
  pngDataUrl: string
  width: number
  height: number
}

type JsPdfInstance = {
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => void
  output: (type: "arraybuffer") => ArrayBuffer
}

type JsPdfConstructor = new (options: {
  orientation: "l" | "p"
  unit: "pt"
  format: [number, number]
  compress: boolean
  precision: number
}) => JsPdfInstance

let browserPromise: Promise<Browser> | null = null
let cachedLibraryBundle: string | null = null
let cachedXyflowCss: string | null = null
let cachedApollonAppCss: string | null = null
let jsPdfConstructor: JsPdfConstructor | null = null

const getJsPdfConstructor = (): JsPdfConstructor => {
  if (jsPdfConstructor) return jsPdfConstructor

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jspdf = require("jspdf") as { jsPDF: JsPdfConstructor }
  jsPdfConstructor = jspdf.jsPDF

  return jsPdfConstructor
}

const getLibraryBundle = (): string => {
  if (cachedLibraryBundle) return cachedLibraryBundle

  // Resolve from the installed package path so this works across cwd/docker layouts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const apollonPackagePath = require.resolve("@tumaet/apollon/package.json")
  const apollonPackageDir = path.dirname(apollonPackagePath)
  const libraryBundlePath = path.join(apollonPackageDir, "dist", "index.js")

  cachedLibraryBundle = fs.readFileSync(libraryBundlePath, "utf8")
  return cachedLibraryBundle
}

const getXyflowCss = (): string => {
  if (cachedXyflowCss) return cachedXyflowCss

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const xyflowCssPath = require.resolve("@xyflow/react/dist/style.css")
  cachedXyflowCss = fs.readFileSync(xyflowCssPath, "utf8")
  return cachedXyflowCss
}

const getApollonAppCss = (): string => {
  if (cachedApollonAppCss) return cachedApollonAppCss

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const apollonPackagePath = require.resolve("@tumaet/apollon/package.json")
  const apollonPackageDir = path.dirname(apollonPackagePath)

  const candidates = [
    path.join(apollonPackageDir, "lib", "styles", "app.css"),
    path.join(apollonPackageDir, "dist", "styles", "app.css"),
  ]
  const cssPath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!cssPath) {
    cachedApollonAppCss = ""
    return cachedApollonAppCss
  }

  cachedApollonAppCss = fs.readFileSync(cssPath, "utf8")
  return cachedApollonAppCss
}

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
  }

  const browser = await browserPromise
  if (browser.isConnected()) return browser

  browserPromise = chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  return browserPromise
}

const closeBrowser = async () => {
  if (!browserPromise) return
  try {
    const browser = await browserPromise
    if (browser.isConnected()) {
      await browser.close()
    }
  } catch {
    // ignore shutdown errors
  } finally {
    browserPromise = null
  }
}

process.once("exit", () => {
  void closeBrowser()
})

const createPlaywrightRouteHandler =
  (libraryBundle: string, xyflowCss: string, apollonAppCss: string) =>
  async (route: Route) => {
    const requestUrl = route.request().url()

    if (requestUrl.endsWith("/")) {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/xyflow.css"><link rel="stylesheet" href="/apollon.css"></head><body><script type="module" src="/main.js"></script></body></html>',
      })
    }

    if (requestUrl.endsWith("/main.js")) {
      return route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: `
window.process = window.process || { env: {} };
if (!window.crypto) { window.crypto = {}; }
if (!window.crypto.randomUUID) {
  window.crypto.randomUUID = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}
import("/library.js")
  .then((Apollon) => {
    window.__Apollon = Apollon;
    window.__apollonReady = true;
  })
  .catch((e) => {
    window.__apollonError = String(e);
  });
`,
      })
    }

    if (requestUrl.endsWith("/xyflow.css")) {
      return route.fulfill({
        status: 200,
        contentType: "text/css",
        body: xyflowCss,
      })
    }

    if (requestUrl.endsWith("/apollon.css")) {
      return route.fulfill({
        status: 200,
        contentType: "text/css",
        body: apollonAppCss,
      })
    }

    if (requestUrl.endsWith("/library.js")) {
      return route.fulfill({
        status: 200,
        contentType: "text/javascript",
        body: libraryBundle,
      })
    }

    if (requestUrl.endsWith("/favicon.ico")) {
      return route.fulfill({ status: 204, body: "" })
    }

    return route.fulfill({ status: 404, body: "Not found" })
  }

const renderModelToRasterizedPngWithBrowser = async (
  model: ExportModel
): Promise<RasterizedResult> => {
  const browser = await getBrowser()
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1200 },
  })
  const libraryBundle = getLibraryBundle()
  const xyflowCss = getXyflowCss()
  const apollonAppCss = getApollonAppCss()
  const routeHandler = createPlaywrightRouteHandler(
    libraryBundle,
    xyflowCss,
    apollonAppCss
  )

  try {
    await page.route("**/*", routeHandler)
    await page.goto("http://apollon.local/", { waitUntil: "load" })
    await page.waitForFunction(
      "() => window.__apollonReady === true || !!window.__apollonError",
      { timeout: 30000 }
    )

    const initError = await page.evaluate(
      () => (globalThis as any).__apollonError
    )
    if (initError) {
      throw new Error(
        `Failed to initialize browser export runtime: ${initError}`
      )
    }

    const result = await page.evaluate(async (inputModel) => {
      const apollonFromWindow = (globalThis as any).__Apollon
      const dynamicImport = new Function(
        "modulePath",
        "return import(modulePath)"
      ) as (modulePath: string) => Promise<any>
      const apollonModule =
        apollonFromWindow && apollonFromWindow.ApollonEditor
          ? apollonFromWindow
          : await dynamicImport("/library.js")

      const apollonEditor =
        apollonModule?.ApollonEditor ||
        apollonModule?.default?.ApollonEditor ||
        (globalThis as any).ApollonEditor

      if (!apollonEditor?.exportModelAsSvg) {
        const moduleKeys = apollonModule ? Object.keys(apollonModule) : []
        throw new Error(
          `Apollon export runtime is not available in page context (module keys: ${moduleKeys.join(", ")})`
        )
      }

      const svgResult = (await apollonEditor.exportModelAsSvg(
        inputModel
      )) as SvgResult
      // Log SVG output for debugging
      console.log("Server SVG Output:", svgResult.svg)
      const width = Math.max(1, Number(svgResult.clip?.width) || 1)
      const height = Math.max(1, Number(svgResult.clip?.height) || 1)
      const scale = 2

      const blob = new Blob([svgResult.svg], {
        type: "image/svg+xml;charset=utf-8",
      })
      const url = URL.createObjectURL(blob)

      try {
        const image = await new Promise<any>((resolve, reject) => {
          const nextImage = new Image()
          nextImage.onload = () => resolve(nextImage)
          nextImage.onerror = () =>
            reject(new Error("Failed to load generated SVG into Image()"))
          nextImage.src = url
        })

        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, width * scale)
        canvas.height = Math.max(1, height * scale)

        const context = canvas.getContext("2d")
        if (!context) {
          throw new Error("Could not get canvas context for PDF export")
        }

        context.setTransform(scale, 0, 0, scale, 0, 0)
        context.clearRect(0, 0, width, height)
        context.drawImage(image, 0, 0, width, height)

        return {
          pngDataUrl: canvas.toDataURL("image/png"),
          width,
          height,
        }
      } finally {
        URL.revokeObjectURL(url)
      }
    }, model)

    return result as RasterizedResult
  } finally {
    await page.unroute("**/*", routeHandler)
    await page.close()
  }
}

export const isExportModel = (value: unknown): value is ExportModel => {
  if (!value || typeof value !== "object") return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.type === "string" &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges) &&
    typeof candidate.assessments === "object" &&
    candidate.assessments !== null
  )
}

export const exportModelAsPdfBuffer = async (
  model: ExportModel
): Promise<Buffer> => {
  try {
    const { pngDataUrl, width, height } =
      await renderModelToRasterizedPngWithBrowser(model)

    const JsPdf = getJsPdfConstructor()
    const pdf = new JsPdf({
      orientation: width > height ? "l" : "p",
      unit: "pt",
      format: [width, height],
      compress: true,
      precision: 2,
    })
    pdf.addImage(pngDataUrl, "PNG", 0, 0, width, height)
    const arrayBuffer = pdf.output("arraybuffer")
    return Buffer.from(arrayBuffer)
  } catch (error) {
    log.error("Failed to convert model to PDF:", error as Error)
    throw error
  }
}
