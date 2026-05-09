import { UMLModel } from "@tumaet/apollon"
import { serverURL } from "@/constants"

export type StoredDiagram = UMLModel & {
  id: string
  createdAt: string
  updatedAt: string
}

export class DiagramAPIManager {
  static async fetchDiagramData(diagramId: string): Promise<UMLModel> {
    const response = await fetch(`${serverURL}/api/diagrams/${diagramId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
    if (!response.ok) {
      throw new Error("Failed to fetch diagram data")
    }
    return response.json()
  }

  static async fetchStoredDiagram(
    diagramId: string
  ): Promise<StoredDiagram | null> {
    const response = await fetch(`${serverURL}/api/diagrams/${diagramId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      throw new Error("Failed to fetch shared diagram data")
    }
    return response.json()
  }

  static async sendDiagramUpdate(diagramId: string, data: UMLModel) {
    const response = await fetch(`${serverURL}/api/diagrams/${diagramId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    })
    if (!response.ok) {
      throw new Error("Failed to update diagram")
    }
  }

  static async createDiagram(data: UMLModel): Promise<{ id: string }> {
    const response = await fetch(`${serverURL}/api/diagrams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    })

    if (!response.ok) {
      throw new Error("Failed to create diagram")
    }

    return response.json()
  }
}
