import React from "react"
import { ClassType } from "@/types"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store"
import { PrimaryButton } from "./PrimaryButton"

interface StereotypeButtonGroupProps {
  nodeId: string
  selectedStereotype?: ClassType
}

const stereotypes: ClassType[] = [
  ClassType.Abstract,
  ClassType.Interface,
  ClassType.Enumeration,
]

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
}

export const StereotypeButtonGroup: React.FC<StereotypeButtonGroupProps> = ({
  nodeId,
  selectedStereotype,
}) => {
  const { setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes }))
  )

  const handleStereotypeChange = (stereotype: ClassType | undefined) => {
    const nextStereotype =
      selectedStereotype === stereotype ? undefined : stereotype

    const needsShrink = !!selectedStereotype && !nextStereotype
    const needExpand = !!nextStereotype && !selectedStereotype
    const nodeHeightDifference = needExpand ? 10 : needsShrink ? -10 : 0

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              stereotype: nextStereotype,
            },
            height: node.height! + nodeHeightDifference,
            measured: {
              ...node.measured,
              height: node.height! + nodeHeightDifference,
            },
          }
        }
        return node
      })
    )
  }

  return (
    <div style={buttonGroupStyle}>
      {stereotypes.map((stereotype, index) => (
        <PrimaryButton
          style={
            index === 0
              ? { borderLeft: "1px solid var(--apollon-primary)" }
              : {}
          }
          key={stereotype}
          isSelected={selectedStereotype === stereotype}
          onClick={() => handleStereotypeChange(stereotype)}
        >
          {stereotype}
        </PrimaryButton>
      ))}
    </div>
  )
}
