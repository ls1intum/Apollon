import { Request, Response, Router } from "express"
import type { RedisJSON } from "@redis/client/dist/lib/commands/generic-transformers"
import { redis } from "./database/connect"
import { Diagram, DIAGRAM_TTL_SECONDS } from "./database/models/Diagram"
import { log } from "./logger"
import { ConversionResource } from "./resources/conversion-resource"

const router = Router()
const conversionResource = new ConversionResource()

function diagramKey(id: string): string {
  return `diagram:${id}`
}

async function getDiagram(key: string): Promise<Diagram | null> {
  const data = await redis.json.get(key)
  if (!data) return null
  return data as unknown as Diagram
}

async function saveDiagram(key: string, diagram: Diagram): Promise<void> {
  await redis.json.set(key, "$", diagram as unknown as RedisJSON)
  await redis.expire(key, DIAGRAM_TTL_SECONDS)
}

router.post("/converter/pdf", (req, res) =>
  conversionResource.convert(req, res)
)

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
