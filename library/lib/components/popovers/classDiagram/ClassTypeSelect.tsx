import { useMemo } from "react"
import { Select, type SelectOption } from "@/components/ui"
import { ClassStereotype } from "@/types"
import { stereotypeLabel } from "@/utils"

/**
 * The four class-diagram classifier kinds a student picks between. They are a
 * lossless projection of the orthogonal data model (`{stereotype, isAbstract}`):
 * the two illegal combinations — an abstract enumeration, and a redundant
 * abstract interface — are simply unrepresentable here, which is the whole point
 * of collapsing the two axes into one control.
 */
export type ClassKind = "class" | "abstract" | "interface" | "enumeration"

type KindDescriptor = {
  value: ClassKind
  label: string
  /** Metaclass keyword shown as a `«…»` line, mirroring the header. */
  keyword?: ClassStereotype
  /** Abstract classifiers render their name in italics (UML 2.5.1 §9.2.4). */
  italic?: boolean
}

const KINDS: readonly KindDescriptor[] = [
  { value: "class", label: "Class" },
  { value: "abstract", label: "Abstract Class", italic: true },
  {
    value: "interface",
    label: "Interface",
    keyword: ClassStereotype.Interface,
  },
  {
    value: "enumeration",
    label: "Enumeration",
    keyword: ClassStereotype.Enumeration,
  },
]

// Each row previews how the kind actually renders — a `«keyword»` chip and/or an
// italic name — so the menu teaches the notation instead of just naming it.
const KindRow = ({ label, keyword, italic }: KindDescriptor) => (
  <span style={{ alignItems: "baseline", display: "flex", gap: 8 }}>
    {keyword && (
      <span style={{ fontSize: "0.85em", opacity: 0.6 }}>
        {stereotypeLabel(keyword)}
      </span>
    )}
    <span style={{ fontStyle: italic ? "italic" : "normal" }}>{label}</span>
  </span>
)

interface ClassTypeSelectProps {
  value: ClassKind
  onChange: (value: ClassKind) => void
}

/**
 * Single "Class type" picker — the popover mirror of the four class palette
 * tiles, and consistent with the other node/edge kind `Select`s (Edge Type,
 * Task Type, Gateway Type). Its value maps to `{stereotype, isAbstract}` in
 * `ClassEditPopover`; a class is always exactly one kind, so there is no empty
 * state.
 */
export const ClassTypeSelect = ({ value, onChange }: ClassTypeSelectProps) => {
  const options: SelectOption[] = useMemo(
    () =>
      KINDS.map((kind) => ({
        value: kind.value,
        label: kind.label,
        renderOption: () => <KindRow {...kind} />,
        renderValue: () => <KindRow {...kind} />,
      })),
    []
  )

  return (
    <Select
      label="Class type"
      aria-label="Class type"
      value={value}
      options={options}
      onChange={(next) => onChange(next as ClassKind)}
    />
  )
}
