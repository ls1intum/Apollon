import { useEffect, useRef, type CSSProperties, type FC } from "react"
import { ApollonEditor } from "@/apollon-editor"
import type { ApollonOptions } from "@/typings"

/**
 * Props for the {@link Apollon} React component.
 *
 * Every {@link ApollonOptions} field is accepted directly as a prop. They are
 * **initial** values: the editor is constructed once when the component
 * mounts. To change the live diagram afterwards, use the {@link ApollonEditor}
 * instance handed to `onReady`.
 */
export interface ApollonProps extends ApollonOptions {
  /**
   * Inline styles for the editor's container element.
   *
   * The container needs an explicit, non-zero height — e.g. `{ height: 600 }`,
   * or `{ height: "100%" }` when every ancestor is also sized — or the canvas
   * renders blank.
   */
  style?: CSSProperties
  /** Class name for the editor's container element. */
  className?: string
  /**
   * Called once, with the underlying {@link ApollonEditor} instance, right
   * after it mounts. Use it for imperative work: exporting, replacing the
   * model, or subscribing to changes.
   */
  onReady?: (editor: ApollonEditor) => void
}

/**
 * Apollon as a React component.
 *
 * ```tsx
 * import { Apollon } from "@tumaet/apollon/react"
 * import { UMLDiagramType } from "@tumaet/apollon/react"
 * import "@tumaet/apollon/style.css"
 *
 * <Apollon type={UMLDiagramType.ClassDiagram} style={{ height: 600 }} />
 * ```
 *
 * Import it from the `@tumaet/apollon/react` subpath so the editor shares your
 * host's React copy. The component owns the editor's lifecycle — it constructs
 * the editor on mount and destroys it on unmount.
 */
export const Apollon: FC<ApollonProps> = ({
  style,
  className,
  onReady,
  ...options
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  // Options and onReady are consumed once, when the editor mounts (the effect
  // below runs on mount only). Snapshotting them in refs lets the dependency
  // array stay honestly empty — listing the props would rebuild the whole
  // editor on every render.
  const optionsRef = useRef(options)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const editor = new ApollonEditor(container, optionsRef.current)
    onReadyRef.current?.(editor)

    return () => editor.destroy()
  }, [])

  return <div ref={containerRef} className={className} style={style} />
}
