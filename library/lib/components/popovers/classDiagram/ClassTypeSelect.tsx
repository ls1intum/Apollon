import { useMemo } from "react"
import { Select, type SelectOption } from "@/components/ui"
import { ClassStereotype } from "@/types"
import { useLabels } from "@/i18n/useLabels"
import { stereotypeLabel } from "@/utils"

/**
 * The four class classifier kinds. They map onto `{stereotype, isAbstract}`; the
 * two invalid combinations (abstract enumeration, redundant abstract interface)
 * are unrepresentable here by design.
 */
export type ClassKind = "class" | "abstract" | "interface" | "enumeration"

type KindDescriptor = {
  value: ClassKind
  label: (t: ReturnType<typeof useLabels>) => string
  /** Metaclass keyword shown as a `«…»` line, mirroring the header. */
  keyword?: ClassStereotype
  /** Abstract classifiers render their name in italics (UML 2.5.1 §9.2.4). */
  italic?: boolean
}

const KINDS: readonly KindDescriptor[] = [
  { value: "class", label: (t) => t.class },
  { value: "abstract", label: (t) => t.abstractClass, italic: true },
  {
    value: "interface",
    label: (t) => t.interface,
    keyword: ClassStereotype.Interface,
  },
  {
    value: "enumeration",
    label: (t) => t.enumeration,
    keyword: ClassStereotype.Enumeration,
  },
]

// Each row previews the notation: a `«keyword»` chip and/or an italic name.
const KindRow = ({
  label,
  keyword,
  italic,
}: Omit<KindDescriptor, "label"> & { label: string }) => (
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
 * Single "Class type" picker; its value maps to `{stereotype, isAbstract}` in
 * `ClassEditPopover`. A class is always exactly one kind, so there is no empty
 * state.
 */
export const ClassTypeSelect = ({ value, onChange }: ClassTypeSelectProps) => {
  const t = useLabels()
  const options: SelectOption[] = useMemo(
    () =>
      KINDS.map((kind) => {
        const label = kind.label(t)
        return {
          value: kind.value,
          label,
          renderOption: () => <KindRow {...kind} label={label} />,
          renderValue: () => <KindRow {...kind} label={label} />,
        }
      }),
    [t]
  )

  return (
    <Select
      label={t.classType}
      aria-label={t.classType}
      value={value}
      options={options}
      onChange={(next) => onChange(next as ClassKind)}
    />
  )
}
