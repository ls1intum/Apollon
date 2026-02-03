/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from "express"
import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import { chromium, Browser } from "playwright"
import { log } from "./logger"

const router = Router()

// Initialize pdfMake with fonts
// pdfmake 0.3.x exports fonts directly as a flat object
pdfMake.vfs = pdfFonts as any

// Browser instance for Playwright (lazy initialized)
let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    log.debug("Launching Playwright browser...")
    browser = await chromium.launch({
      headless: true,
    })
    log.debug("Playwright browser launched successfully")
  }
  return browser
}

// Cleanup browser on process exit
process.on("SIGINT", async () => {
  if (browser) {
    log.debug("Closing Playwright browser on SIGINT...")
    await browser.close()
    browser = null
  }
  process.exit(0)
})

process.on("SIGTERM", async () => {
  if (browser) {
    log.debug("Closing Playwright browser on SIGTERM...")
    await browser.close()
    browser = null
  }
  process.exit(0)
})

/**
 * Helper function to convert SVG to PDF and send as response
 */
async function svgToPdfResponse(
  svg: string,
  width: number,
  height: number,
  res: Response
): Promise<void> {
  const doc = pdfMake.createPdf({
    content: [{ svg }],
    pageSize: { width, height },
    pageMargins: 0,
  })

  // getStream returns a Promise in pdfmake 0.3.x
  const pdfStream =
    await (doc.getStream() as unknown as Promise<NodeJS.ReadableStream>)
  res.type("application/pdf")
  pdfStream.pipe(res)
  ;(pdfStream as any).end()
}

/**
 * POST /api/converter/pdf
 * Converts an SVG string to PDF
 *
 * Request body: { svg: string, width: number, height: number }
 * Response: PDF binary stream
 */
router.post("/pdf", async (req: Request, res: Response): Promise<any> => {
  try {
    const { svg, width, height } = req.body

    if (!svg) {
      return res.status(400).json({ error: "SVG content is required" })
    }

    if (width === undefined || height === undefined) {
      return res
        .status(400)
        .json({ error: "Both width and height are required" })
    }

    log.debug(`Converting SVG to PDF (${width}x${height})`)

    await svgToPdfResponse(svg, width, height, res)
  } catch (error) {
    log.error("Error in SVG to PDF conversion:", error as Error)
    res.status(500).json({ error: "Failed to convert SVG to PDF" })
  }
})

/**
 * POST /api/converter/model-to-pdf
 * Converts a UML model to PDF by rendering it in a real browser using Playwright
 *
 * Request body: { model: UMLModel }
 * Response: PDF binary
 */
router.post(
  "/model-to-pdf",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { model } = req.body

      if (!model) {
        return res.status(400).json({ error: "Model is required" })
      }

      // Parse model if it's a string
      const parsedModel = typeof model === "string" ? JSON.parse(model) : model

      // Serialize the model for injection
      const modelJson = JSON.stringify(parsedModel)

      // Get the webapp URL from environment or use default
      const webappUrl = process.env.WEBAPP_URL || "http://localhost:5173"
      // Use render page without model param - we'll inject the model via JS
      const renderUrl = `${webappUrl}/render`

      log.debug(`Rendering model via injection at: ${renderUrl}`)

      const browserInstance = await getBrowser()
      const page = await browserInstance.newPage()

      try {
        // Inject the model into window before page loads
        await page.addInitScript((model: string) => {
          ;(window as any).__APOLLON_INJECTED_MODEL__ = model
        }, modelJson)

        // Navigate to the render page
        await page.goto(renderUrl, {
          waitUntil: "networkidle",
          timeout: 30000,
        })

        // Wait for the page to signal it's ready
        await page.waitForFunction(
          () => (window as any).__APOLLON_RENDER_READY__ === true,
          { timeout: 30000 }
        )

        // Check for errors
        const errorMessage = await page.evaluate(
          () => (window as any).__APOLLON_ERROR__
        )
        if (errorMessage) {
          throw new Error(errorMessage)
        }

        // Export the SVG
        const result = await page.evaluate(async () => {
          return await (window as any).__APOLLON_EXPORT_SVG__()
        })

        await page.close()

        // Convert SVG to PDF
        const { svg, clip } = result
        log.debug(`SVG exported successfully (${clip.width}x${clip.height})`)

        await svgToPdfResponse(svg, clip.width, clip.height, res)
      } catch (pageError) {
        await page.close()
        throw pageError
      }
    } catch (error) {
      log.error("Error in model to PDF conversion:", error as Error)
      res.status(500).json({
        error: "Failed to convert model to PDF",
        details: (error as Error).message,
      })
    }
  }
)

/**
 * POST /api/converter/model-to-svg
 * Converts a UML model to SVG by rendering it in a real browser using Playwright
 *
 * Request body: { model: UMLModel }
 * Response: { svg: string, clip: { x, y, width, height } }
 */
router.post(
  "/model-to-svg",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { model } = req.body

      if (!model) {
        return res.status(400).json({ error: "Model is required" })
      }

      const parsedModel = typeof model === "string" ? JSON.parse(model) : model

      // Serialize the model for injection (avoids URL length limits)
      const modelJson = JSON.stringify(parsedModel)

      const webappUrl = process.env.WEBAPP_URL || "http://localhost:5173"
      const renderUrl = `${webappUrl}/render`

      log.debug(`Rendering model to SVG via injection at: ${renderUrl}`)

      const browserInstance = await getBrowser()
      const page = await browserInstance.newPage()

      try {
        // Inject the model into window before page loads
        await page.addInitScript((model: string) => {
          ;(window as any).__APOLLON_INJECTED_MODEL__ = model
        }, modelJson)

        await page.goto(renderUrl, {
          waitUntil: "networkidle",
          timeout: 30000,
        })

        // Wait for the page to signal it's ready
        await page.waitForFunction(
          () => (window as any).__APOLLON_RENDER_READY__ === true,
          { timeout: 30000 }
        )

        // Check for errors
        const errorMessage = await page.evaluate(
          () => (window as any).__APOLLON_ERROR__
        )
        if (errorMessage) {
          throw new Error(errorMessage)
        }

        // Export the SVG
        const result = await page.evaluate(async () => {
          return await (window as any).__APOLLON_EXPORT_SVG__()
        })

        await page.close()

        log.debug(
          `SVG exported successfully (${result.clip.width}x${result.clip.height})`
        )
        res.json(result)
      } catch (pageError) {
        await page.close()
        throw pageError
      }
    } catch (error) {
      log.error("Error in model to SVG conversion:", error as Error)
      res.status(500).json({
        error: "Failed to convert model to SVG",
        details: (error as Error).message,
      })
    }
  }
)

/**
 * GET /api/converter/status
 * Health check endpoint for the conversion service
 */
router.get("/status", (_req: Request, res: Response) => {
  res.sendStatus(200)
})

export default router
