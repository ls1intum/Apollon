import React from "react"
import { Toggle } from "@base-ui/react/toggle"
import { ToggleGroup } from "@base-ui/react/toggle-group"
import { ClassStereotype } from "@/types"
import { useShallow } from "zustand/shallow"
import { useDiagramStore } from "@/store"

interface StereotypeButtonGroupProps {
  nodeId: string
  selectedStereotype?: ClassStereotype
  isAbstract?: boolean
}

// The class "kind" is presented as one exclusive toggle group, but maps to two
// orthogonal model fields. `Abstract` is a MODIFIER (UML 2.5.1 §9.2.4: italic
// name, no keyword) stored as `isAbstract`; `Interface`/`Enumeration` are
// metaclass KEYWORDS (`«interface»` / `«enumeration»`) stored as `stereotype`.
// Keeping them mutually exclusive in the UI matches the educational model — a
// class is abstract, an interface, an enumeration, or plain.
const ABSTRACT_CHOICE = "abstract" as const
type KindChoice = typeof ABSTRACT_CHOICE | ClassStereotype

const CHOICES: { value: KindChoice; label: string }[] = [
  { value: ABSTRACT_CHOICE, label: "Abstract" },
  { value: ClassStereotype.Interface, label: "Interface" },
  { value: ClassStereotype.Enumeration, label: "Enumeration" },
]

export const StereotypeButtonGroup: React.FC<StereotypeButtonGroupProps> = ({
  nodeId,
  selectedStereotype,
  isAbstract = false,
}) => {
  const { setNodes } = useDiagramStore(
    useShallow((state) => ({ setNodes: state.setNodes }))
  )

  const selected: KindChoice | undefined = isAbstract
    ? ABSTRACT_CHOICE
    : selectedStereotype

  const applyChoice = (next: KindChoice | undefined) => {
    const willHaveKeyword =
      next === ClassStereotype.Interface || next === ClassStereotype.Enumeration
    // Only the keyword line changes header height; the abstract modifier renders
    // an italic name with no extra line, so toggling it leaves the box height
    // untouched.
    const hadKeyword = !!selectedStereotype
    const heightDifference =
      willHaveKeyword && !hadKeyword
        ? 10
        : !willHaveKeyword && hadKeyword
          ? -10
          : 0

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node
        return {
          ...node,
          data: {
            ...node.data,
            stereotype: willHaveKeyword ? (next as ClassStereotype) : undefined,
            isAbstract: next === ABSTRACT_CHOICE,
          },
          height: node.height! + heightDifference,
          measured: {
            ...node.measured,
            height: node.height! + heightDifference,
          },
        }
      })
    )
  }

  // Single-select, allow-deselect: Base UI ToggleGroup (default `multiple`
  // false) keeps at most one value pressed and clears it when the pressed item
  // is toggled off, so the empty array maps to "plain class".
  const handleValueChange = (groupValue: KindChoice[]) => {
    applyChoice(groupValue[0])
  }

  return (
    <ToggleGroup
      data-slot="toggle-group"
      className="apollon-stereotype-group"
      // Base UI's composite root emits `aria-orientation` on the `role="group"`
      // element, which ARIA forbids on `group` (axe: aria-allowed-attr). Strip the
      // disallowed attribute; keyboard nav and styling are unaffected.
      aria-orientation={undefined}
      value={selected ? [selected] : []}
      onValueChange={handleValueChange}
    >
      {CHOICES.map(({ value, label }) => (
        <Toggle
          key={value}
          value={value}
          data-slot="toggle-group-item"
          className="apollon-stereotype-toggle"
          // Mirror the shadcn/@tumaet contract: expose selection as
          // data-state="on" (styled in app.css) rather than a hardcoded
          // colour. Base UI's own data-pressed stays for parity.
          data-state={selected === value ? "on" : "off"}
        >
          {label}
        </Toggle>
      ))}
    </ToggleGroup>
  )
}
