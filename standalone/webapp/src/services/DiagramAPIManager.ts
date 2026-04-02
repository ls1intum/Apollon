import { UMLModel } from "@tumaet/apollon"
import { serverURL } from "@/constants"

export class DiagramAPIManager {
  static async fetchDiagramData(diagramId: string): Promise<UMLModel> {
    const response = await fetch(`${serverURL}/api/${diagramId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) {
      throw new Error("Failed to fetch diagram data")
    }
    return response.json()
  }

  static async sendDiagramUpdate(diagramId: string, data: UMLModel) {
    const response = await fetch(`${serverURL}/api/${diagramId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error("Failed to update diagram")
    }
  }

  static async createDiagram(data: UMLModel): Promise<{ id: string }> {
    const response = await fetch(`${serverURL}/api/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to create diagram")
    }

    return response.json()
  }
}
