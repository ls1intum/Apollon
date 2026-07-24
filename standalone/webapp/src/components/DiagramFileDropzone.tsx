import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { FileUpIcon } from "lucide-react"
import { toast } from "react-toastify"
import { useImportDiagramFile } from "@/hooks/useImportDiagramFile"

/** True when the drag carries files — a link or text drag keeps its native behaviour. */
const dragHasFiles = (event: DragEvent) =>
  event.dataTransfer?.types.includes("Files") ?? false

const isJson = (file: File) =>
  file.type === "application/json" || file.name.toLowerCase().endsWith(".json")

/**
 * Makes the whole window accept a dropped `.json` diagram, importing it as a
 * new diagram.
 *
 * The listeners are on `window`, not a wrapper element, because the browser
 * opens a dropped file unless BOTH `dragover` and `drop` are cancelled on the
 * path to the document — so any gap a wrapper leaves (page margins, the version
 * rail, a portaled dialog, the moments before a route mounts) would navigate
 * away from the app to the raw JSON instead. Cancelling at the window closes
 * every gap at once; see MDN's "File drag and drop".
 *
 * Mounted once, at the root layout.
 */
export function DiagramFileDropzone() {
  const importFile = useImportDiagramFile()
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  // Drag events fire per element, so a plain boolean flickers as the pointer
  // crosses children. Counting enter/leave tracks the window as one surface.
  const dragDepthRef = useRef(0)

  const endDrag = useCallback(() => {
    dragDepthRef.current = 0
    setIsDraggingFile(false)
  }, [])

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!dragHasFiles(event)) return
      event.preventDefault()
      dragDepthRef.current += 1
      setIsDraggingFile(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!dragHasFiles(event)) return
      // Cancelling `dragover` is what both allows the drop and stops the
      // browser from navigating to the file.
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"
    }

    const onDragLeave = (event: DragEvent) => {
      if (!dragHasFiles(event)) return
      dragDepthRef.current -= 1
      if (dragDepthRef.current <= 0) endDrag()
    }

    const onDrop = (event: DragEvent) => {
      if (!dragHasFiles(event)) return
      event.preventDefault()
      endDrag()

      const files = Array.from(event.dataTransfer?.files ?? [])
      const diagram = files.find(isJson)
      if (!diagram) {
        toast.error("Drop a .json diagram exported from Apollon.")
        return
      }
      void importFile(diagram)
    }

    // A drag that ends outside the window (Escape, or dropping on another app)
    // leaves the overlay up without this.
    window.addEventListener("dragenter", onDragEnter)
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)
    window.addEventListener("dragend", endDrag)
    return () => {
      window.removeEventListener("dragenter", onDragEnter)
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("dragend", endDrag)
    }
  }, [importFile, endDrag])

  if (!isDraggingFile) return null

  return createPortal(
    <div
      // Decorative: the drop is handled on the window, and the same import is
      // reachable from the File menu and the home page's Import button.
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary bg-background/60 px-10 py-8 text-center shadow-lg">
        <FileUpIcon className="size-9 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">
            Drop to import a diagram
          </p>
          <p className="text-sm text-muted-foreground">
            A <code className="font-mono">.json</code> file exported from
            Apollon opens as a new diagram.
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}
