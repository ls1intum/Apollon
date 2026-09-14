import { useDiagramStore } from "@/store"
import { DescribedNodeProps } from "@/types"
import { useShallow } from "zustand/shallow"
import { TextField } from "@/components/ui"
import { useLabels } from "@/i18n/useLabels"
import { PopoverSection } from "../PopoverLayout"

/**
 * The Technology + Description pair every deployment-palette node can carry.
 *
 * One component rather than a copy per popover: the three deployment shapes
 * render the same two lines under the name, so they should also edit them the
 * same way. Both fields write straight through on change — they are free text
 * with no validation, and an empty string is stored rather than the key being
 * deleted, so clearing a field behaves like clearing the name does.
 */
export const DescribedNodeSection: React.FC<{ elementId: string }> = ({
  elementId,
}) => {
  const t = useLabels()
  const { nodes, setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes, nodes: state.nodes }))
  )

  const node = nodes.find((node) => node.id === elementId)
  if (!node) {
    return null
  }

  const nodeData = node.data as DescribedNodeProps

  const handleChange = (
    key: "technology" | "description",
    value: string
  ): void => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === elementId
          ? { ...node, data: { ...node.data, [key]: value } }
          : node
      )
    )
  }

  return (
    <PopoverSection title={t.details} divider>
      <TextField
        label={t.technology}
        value={nodeData.technology ?? ""}
        onChange={(e) => handleChange("technology", e.target.value)}
        placeholder={t.technologyPlaceholder}
        fullWidth
      />
      <TextField
        label={t.description}
        value={nodeData.description ?? ""}
        onChange={(e) => handleChange("description", e.target.value)}
        placeholder={t.descriptionPlaceholder}
        multiline
        minRows={2}
        fullWidth
      />
    </PopoverSection>
  )
}
