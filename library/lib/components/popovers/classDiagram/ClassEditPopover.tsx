import { NodeStyleEditor } from "@/components"
import { useDiagramStore } from "@/store"
import { ClassNodeProps, ClassStereotype } from "@/types"
import { LAYOUT } from "@/constants"
import { useShallow } from "zustand/shallow"
import { EditableAttributeList } from "./EditableAttributesList"
import { EditableMethodsList } from "./EditableMethodsList"
import { ClassTypeSelect, type ClassKind } from "./ClassTypeSelect"
import { PopoverProps } from "../types"
import { useLabels } from "@/i18n/useLabels"
import { PopoverLayout, PopoverSection } from "../PopoverLayout"

// A kind maps to both fields at once. Writing both on every change keeps them
// consistent: a plain class can't keep a stale `isAbstract`, and a keyword can't
// carry the (invalid) abstract modifier.
const KIND_TO_DATA: Record<
  ClassKind,
  { stereotype?: ClassStereotype; isAbstract: boolean }
> = {
  class: { stereotype: undefined, isAbstract: false },
  abstract: { stereotype: undefined, isAbstract: true },
  interface: { stereotype: ClassStereotype.Interface, isAbstract: false },
  enumeration: { stereotype: ClassStereotype.Enumeration, isAbstract: false },
}

const hasKeyword = (kind: ClassKind) =>
  kind === "interface" || kind === "enumeration"

const kindOf = (data: ClassNodeProps): ClassKind => {
  // Stereotype wins, so a stray `isAbstract` beside a keyword never surfaces.
  if (data.stereotype === ClassStereotype.Enumeration) return "enumeration"
  if (data.stereotype === ClassStereotype.Interface) return "interface"
  if (data.isAbstract) return "abstract"
  return "class"
}

export const ClassEditPopover: React.FC<PopoverProps> = ({ elementId }) => {
  const t = useLabels()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({
      nodes: state.nodes,
      setNodes: state.setNodes,
    }))
  )

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as ClassNodeProps
  const currentKind = kindOf(nodeData)

  const handleDataFieldUpdate = (key: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              [key]: value,
            },
          }
        }
        return node
      })
    )
  }

  const setKind = (next: ClassKind) => {
    const mapped = KIND_TO_DATA[next]
    // A keyword adds a header line; the abstract modifier (italics) does not.
    const keywordLinePx =
      LAYOUT.DEFAULT_HEADER_HEIGHT_WITH_STEREOTYPE -
      LAYOUT.DEFAULT_HEADER_HEIGHT
    const delta =
      ((hasKeyword(next) ? 1 : 0) - (hasKeyword(currentKind) ? 1 : 0)) *
      keywordLinePx
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== elementId) return node
        const height = (node.height ?? 0) + delta
        return {
          ...node,
          data: {
            ...node.data,
            stereotype: mapped.stereotype,
            isAbstract: mapped.isAbstract,
          },
          height,
          measured: { ...node.measured, height },
        }
      })
    )
  }

  return (
    <PopoverLayout title={t.class}>
      <NodeStyleEditor
        nodeData={nodeData}
        colorEditorLabel={t.classWord}
        handleDataFieldUpdate={handleDataFieldUpdate}
      />
      <PopoverSection divider>
        <ClassTypeSelect value={currentKind} onChange={setKind} />
      </PopoverSection>
      <PopoverSection divider>
        <EditableAttributeList nodeId={elementId} />
      </PopoverSection>
      <PopoverSection divider>
        <EditableMethodsList nodeId={elementId} />
      </PopoverSection>
    </PopoverLayout>
  )
}
