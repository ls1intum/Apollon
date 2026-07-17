import { useCallback, useRef, useState, type ReactNode } from "react"
import { FileUpIcon } from "lucide-react"
import { toast } from "react-toastify"
import { cn } from "@tumaet/ui/lib/utils"
import { useImportDiagramFile } from "@/hooks/useImportDiagramFile"

/** True when the drag carries files (not, say, a palette element or text). */
const dragHasFiles = (event: React.DragEvent) =>
  event.dataTransfer.types.includes("Files")

const isJson = (file: File) =>
  file.type === "application/json" || file.name.toLowerCase().endsWith(".json")

interface DiagramFileDropzoneProps {
  children: ReactNode
  /** Applied to the wrapper — pass the sizing the surface needs (e.g. `h-full`). */
  className?: string
}

/**
 * Drop a `.json` diagram anywhere on the wrapped surface to import it as a new
 * diagram — the drag-and-drop path alongside the File-menu "Import" item. While
 * a file is dragged over, a full-surface overlay invites the drop; the wrapper
 * (not the overlay) carries the handlers so it still catches events that bubble
 * up from the canvas or gallery beneath it.
 */
export function DiagramFileDropzone({
  children,
  className,
}: DiagramFileDropzoneProps) {
  const importFile = useImportDiagramFile()
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  // Drag events fire for every nested element, so a single boolean would flicker
  // as the pointer crosses children. Counting enter/leave tracks the surface.
  const dragDepthRef = useRef(0)

  const onDragEnter = useCallback((event: React.DragEvent) => {
    if (!dragHasFiles(event)) return
    dragDepthRef.current += 1
    setIsDraggingOver(true)
  }, [])

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!dragHasFiles(event)) return
    // Both required for the surface to accept a drop and show the copy cursor.
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const onDragLeave = useCallback((event: React.DragEvent) => {
    if (!dragHasFiles(event)) return
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDraggingOver(false)
    }
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (!dragHasFiles(event)) return
      event.preventDefault()
      dragDepthRef.current = 0
      setIsDraggingOver(false)

      const files = Array.from(event.dataTransfer.files)
      const diagram = files.find(isJson)
      if (!diagram) {
        toast.error("Drop a .json diagram exported from Apollon.")
        return
      }
      void importFile(diagram)
    },
    [importFile]
  )

  return (
    <div
      className={cn("relative", className)}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {isDraggingOver && (
        <div
          // Decorative: the drop is handled on the wrapper, and the same import
          // is reachable from the File menu and the home page's Import button.
          aria-hidden
          className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
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
        </div>
      )}
    </div>
  )
}
