import React from "react"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { ClassType } from "@/types"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store"

interface StereotypeButtonGroupProps {
  nodeId: string
  selectedStereotype?: ClassType
}

const stereotypes: ClassType[] = [
  ClassType.Abstract,
  ClassType.Interface,
  ClassType.Enumeration,
]

export const StereotypeButtonGroup: React.FC<StereotypeButtonGroupProps> = ({
  nodeId,
  selectedStereotype,
}) => {
  const { setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes }))
  )

  const applyStereotype = (nextStereotype: ClassType | undefined) => {
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

  // Single-select, allow-deselect: Base UI ToggleGroup (default `multiple`
  // false) keeps at most one value pressed and clears it when the pressed item
  // is toggled off, so the empty array maps to "no stereotype".
  const handleValueChange = (groupValue: ClassType[]) => {
    applyStereotype(groupValue[0])
  }

  return (
    <ToggleGroup
      data-slot="toggle-group"
      className="apollon-stereotype-group"
      value={selectedStereotype ? [selectedStereotype] : []}
      onValueChange={handleValueChange}
    >
      {stereotypes.map((stereotype) => (
        <Toggle
          key={stereotype}
          value={stereotype}
          data-slot="toggle-group-item"
          className="apollon-stereotype-toggle"
          // Mirror the shadcn/@tumaet contract: expose selection as
          // data-state="on" (styled in app.css) rather than a hardcoded
          // colour. Base UI's own data-pressed stays for parity.
          data-state={selectedStereotype === stereotype ? "on" : "off"}
        >
          {stereotype}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
