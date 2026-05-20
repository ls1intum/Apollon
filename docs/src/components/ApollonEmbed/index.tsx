import { useEffect, useRef } from "react"
import {
  ApollonEditor,
  ApollonMode,
  Locale,
  UMLDiagramType,
} from "@tumaet/apollon"
import "@tumaet/apollon/style.css"

/**
 * Live Apollon editor mounted inside the docs site.
 *
 * Wrap in `<BrowserOnly>` at the call site — `ApollonEditor` touches
 * `window` during construction, which would crash Docusaurus's SSR
 * pre-render pass.
 */
export default function ApollonEmbed({
  diagramType = UMLDiagramType.ClassDiagram,
}: {
  diagramType?: UMLDiagramType
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<ApollonEditor | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    editorRef.current = new ApollonEditor(containerRef.current, {
      type: diagramType,
      mode: ApollonMode.Modelling,
      locale: Locale.en,
    })

    return () => {
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [diagramType])

  return <div ref={containerRef} className="apollon-embed-frame" />
}
