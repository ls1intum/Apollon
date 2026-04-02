/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, Router } from "express"
import { redis } from "./database/connect"
import { Diagram, DIAGRAM_TTL_SECONDS } from "./database/models/Diagram"
import { log } from "./logger"
import { ConversionResource } from "./resources/conversion-resource"

const router = Router()
const conversionResource = new ConversionResource()

function diagramKey(id: string): string {
  return `diagram:${id}`
}

router.post("/converter/pdf", (req, res) =>
  conversionResource.convert(req, res)
)

router.get("/:diagramID", async (req: Request, res: Response): Promise<any> => {
  try {
    const diagramID = req.params.diagramID as string
    const data = await redis.json.get(diagramKey(diagramID))
    if (!data) {
      return res.status(404).json({ error: "Diagram not found" })
    }
    res.status(200).json(data)
  } catch (error) {
    log.error("Error in getDiagram endpoint:", error as Error)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.post("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { id, version, title, type, nodes, edges, assessments } = req.body

    if (!id || !version || !title || !type) {
      return res
        .status(400)
        .json({ error: "ID, version, title, and type are required" })
    }

    const now = new Date().toISOString()
    const existing = (await redis.json.get(
      diagramKey(id)
    )) as unknown as Diagram | null

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

    await redis.json.set(diagramKey(id), "$", diagram as any)
    await redis.expire(diagramKey(id), DIAGRAM_TTL_SECONDS)

    res.status(existing ? 200 : 201).json(diagram)
  } catch (error) {
    log.error("Error in setDiagram endpoint:", error as Error)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.put("/:diagramID", async (req: Request, res: Response): Promise<any> => {
  try {
    const diagramID = req.params.diagramID as string
    const { version, title, type, nodes, edges, assessments } = req.body

    if (!version || !title || !type) {
      return res
        .status(400)
        .json({ error: "Version, title, and type are required" })
    }

    const key = diagramKey(diagramID)
    const existing = (await redis.json.get(key)) as unknown as Diagram | null

    if (!existing) {
      return res.status(404).json({ error: "Diagram not found" })
    }

    const diagram: Diagram = {
      id: diagramID,
      version,
      title,
      type,
      nodes: nodes || [],
      edges: edges || [],
      assessments: assessments || {},
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    }

    await redis.json.set(key, "$", diagram as any)
    await redis.expire(key, DIAGRAM_TTL_SECONDS)

    res.status(200).json(diagram)
  } catch (error) {
    log.error("Error in updateDiagram endpoint:", error as Error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
