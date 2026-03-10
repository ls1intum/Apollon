/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router, Request, Response } from "express"
import Diagram from "./database/models/Diagram"
import { log } from "./logger"
import {
  exportModelAsPdfBuffer,
  ExportModel,
  isExportModel,
} from "./services/pdfExportService"

const router = Router()

const sanitizeFileName = (value: string): string => {
  const sanitized = value.replace(/[\\/:*?"<>|]+/g, "_").trim()
  return sanitized || "diagram"
}

router.post(
  "/converter/pdf",
  async (req: Request, res: Response): Promise<any> => {
    try {
      let inputData: unknown = req.body?.model ?? req.body

      if (typeof inputData === "string") {
        try {
          inputData = JSON.parse(inputData)
        } catch {
          return res.status(400).json({ error: "Model must be valid JSON" })
        }
      }

      // Import from the built library package
      const { importDiagram } = await import("@tumaet/apollon")

      // Convert any version (V2, V3, V4) to normalized V4 format
      let normalizedModel: any
      try {
        normalizedModel = importDiagram(inputData)
      } catch (convertError) {
        log.error("Failed to convert diagram version:", convertError as Error)
        return res.status(400).json({
          error: "Invalid diagram format. Expected V2, V3, or V4 UML model.",
        })
      }

      // Validate the normalized model has required PDF export fields
      if (!isExportModel(normalizedModel)) {
        return res.status(400).json({
          error:
            "Diagram missing required fields after conversion. Expected { id, version, title, type, nodes, edges, assessments }",
        })
      }

      const exportModel: ExportModel = {
        ...normalizedModel,
        assessments: normalizedModel.assessments || {},
      }
      const pdfBuffer = await exportModelAsPdfBuffer(exportModel)
      const fileName = sanitizeFileName(exportModel.title)

      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"${fileName}.pdf\"`
      )
      res.setHeader("Content-Length", pdfBuffer.length.toString())

      return res.status(200).send(pdfBuffer)
    } catch (error) {
      log.error("Error in exportDiagramAsPdf endpoint:", error as Error)
      return res.status(500).json({ error: "Failed to export diagram as PDF" })
    }
  }
)

router.get("/:diagramID", async (req: Request, res: Response): Promise<any> => {
  try {
    const diagram = await Diagram.findById(req.params.diagramID)
    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" })
    }

    res.status(200).json(diagram)
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
        .json({ error: "ID, version, title, and diagramType are required" })
    }

    const existingDiagram = await Diagram.findById(id)

    if (existingDiagram) {
      const updatedDiagram = await Diagram.findByIdAndUpdate(
        id,
        { version, title, type, nodes, edges },
        { new: true } // Return updated document
      )
      return res.status(200).json(updatedDiagram)
    }

    const newDiagram = new Diagram({
      _id: id,
      version,
      title,
      type,
      nodes: nodes || [],
      edges: edges || [],
      assessments: assessments || {},
    })

    const savedDiagram = await newDiagram.save()
    res.status(201).json(savedDiagram)
  } catch (error) {
    log.error("Error in setDiagram endpoint:", error as Error)
    res.status(500).json({ error: "Internal server error" })
  }
})

router.put("/:diagramID", async (req: Request, res: Response): Promise<any> => {
  try {
    const { version, title, type, nodes, edges, assessments } = req.body

    // Validate required fields
    if (!version || !title || !type) {
      return res
        .status(400)
        .json({ error: "Version, title, and diagramType are required" })
    }

    // Update diagram
    const updatedDiagram = await Diagram.findByIdAndUpdate(
      req.params.diagramID,
      {
        $set: {
          version,
          title,
          type,
          nodes: nodes || [],
          edges: edges || [],
          assessments: assessments || {},
        },
      },
      {
        new: true, // Return updated document
        runValidators: true, // Ensure schema validation
      }
    )

    if (!updatedDiagram) {
      return res.status(404).json({ error: "Diagram not found" })
    }

    res.status(200).json(updatedDiagram)
  } catch (error) {
    log.error("Error in updateDiagram endpoint:", error as Error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
