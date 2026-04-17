import { Request, Response, Router } from "express"
import { redis } from "./database/connect"
import { Diagram, DIAGRAM_TTL_SECONDS } from "./database/models/Diagram"
import { log } from "./logger"

const router = Router()

let conversionResourcePromise: Promise<{
  convert: (req: Request, res: Response) => Promise<void>
}> | null = null

async function getConversionResource() {
  conversionResourcePromise ??= import("./resources/conversion-resource").then(
    ({ ConversionResource }) => new ConversionResource()
  )

  return conversionResourcePromise
}

function diagramKey(id: string): string {
  return `diagram:${id}`
}

async function getDiagram(key: string): Promise<Diagram | null> {
  const json = await redis.get(key)
  if (!json) return null
  return JSON.parse(json) as Diagram
}

async function saveDiagram(key: string, diagram: Diagram): Promise<void> {
  await redis.set(key, JSON.stringify(diagram), { EX: DIAGRAM_TTL_SECONDS })
}

router.get("/converter/status", (_req, res) => {
  res.sendStatus(200)
})

router.post("/converter/pdf", async (req, res, next) => {
  try {
    const conversionResource = await getConversionResource()
    await conversionResource.convert(req, res)
  } catch (error) {
    next(error)
  }
})

router.get(
  "/:diagramID",
  async (req: Request<{ diagramID: string }>, res: Response): Promise<void> => {
    try {
      const diagram = await getDiagram(diagramKey(req.params.diagramID))
      if (!diagram) {
        res.status(404).json({ error: "Diagram not found" })
        return
      }
      res.status(200).json(diagram)
    } catch (error) {
      log.error("Error in getDiagram endpoint:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, version, title, type, nodes, edges, assessments } = req.body

    if (!id || !version || !title || !type) {
      res
        .status(400)
        .json({ error: "ID, version, title, and type are required" })
      return
    }

    const now = new Date().toISOString()
    const existing = await getDiagram(diagramKey(id))

    const diagram: Diagram = {
      id,
      version,
      title,
      type,
      nodes: nodes || [],
      edges: edges || [],
      assessments: assessments || {},
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    }

    await saveDiagram(diagramKey(id), diagram)
    res.status(existing ? 200 : 201).json(diagram)
  } catch (error) {
    log.error("Error in setDiagram endpoint:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.put(
  "/:diagramID",
  async (req: Request<{ diagramID: string }>, res: Response): Promise<void> => {
    try {
      const { version, title, type, nodes, edges, assessments } = req.body

      if (!version || !title || !type) {
        res.status(400).json({ error: "Version, title, and type are required" })
        return
      }

      const key = diagramKey(req.params.diagramID)
      const existing = await getDiagram(key)

      if (!existing) {
        res.status(404).json({ error: "Diagram not found" })
        return
      }

      const diagram: Diagram = {
        id: req.params.diagramID,
        version,
        title,
        type,
        nodes: nodes || [],
        edges: edges || [],
        assessments: assessments || {},
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      }

      await saveDiagram(key, diagram)
      res.status(200).json(diagram)
    } catch (error) {
      log.error("Error in updateDiagram endpoint:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
