import { useState } from "react"
import type { UMLDiagramType } from "@tumaet/apollon"

export const useRecentDiagramFilters = (initialSearchTerm = "") => {
  const [searchTerm, setSearch] = useState(initialSearchTerm)
  const [selectedTypes, setSelectedTypes] = useState<UMLDiagramType[]>([])

  const toggleTypeFilter = (type: UMLDiagramType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  return { searchTerm, selectedTypes, setSearch, toggleTypeFilter }
}
