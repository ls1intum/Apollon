import { PlaygroundDefaultModel } from "@/constants/playgroundDefaultDiagram"
import { usePersistenceModelStore } from "@/stores/usePersistenceModelStore"
import {
  AssessmentViewData,
  getEdgeAssessmentDataById,
  getNodeAssessmentDataByNodeElementId,
} from "@tumaet/apollon"
import React, { useMemo } from "react"

interface Props {
  assessmentSelectedElements: string[]
}

export const AssessmentDataBox: React.FC<Props> = ({
  assessmentSelectedElements,
}) => {
  const diagram = usePersistenceModelStore(
    (store) => store.models[PlaygroundDefaultModel.id]
  )

  const assessmentDatas = useMemo(() => {
    const result: AssessmentViewData[] = []

    for (const elementId of assessmentSelectedElements) {
      let data = getNodeAssessmentDataByNodeElementId(elementId, diagram.model)
      if (data) {
        result.push(data)
      }
      data = getEdgeAssessmentDataById(elementId, diagram.model)
      if (data) {
        result.push(data)
      }
    }
    return result
  }, [assessmentSelectedElements])

  if (assessmentSelectedElements.length === 0) {
    return null
  }

  return (
    <div className="p-2 border border-gray-400 rounded-md flex flex-col gap-2">
      <label className="font-semibold">Selected Elements ids:</label>
      <div className="flex flex-col">
        {assessmentSelectedElements.map((id) => (
          <span key={id} className="text-[10px]">
            <span className="font-bold">id:</span> {id}
          </span>
        ))}
      </div>

      {assessmentDatas.map((data) => (
        <div key={data.feedback} className="border-b border-gray-300 text-sm">
          <div>
            <span className="font-bold">name:</span> {data.name}
          </div>
          <div>
            <span className="font-bold">score:</span> {data.score}
          </div>
          <div>
            <span className="font-bold">feedback:</span> {data.feedback}
          </div>
          <div>
            <span className="font-bold">elementId:</span> {data.elementId}
          </div>
          <div>
            <span className="font-bold">elementType:</span> {data.elementType}
          </div>
        </div>
      ))}
    </div>
  )
}
