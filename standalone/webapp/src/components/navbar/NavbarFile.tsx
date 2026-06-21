import { FC, useCallback, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"
import { toast } from "react-toastify"
import { useModalContext } from "@/contexts"
import {
  useExportAsJSON,
  useExportAsPDF,
  useExportAsPNG,
  useExportAsSVG,
} from "@/hooks"
import { log } from "@/logger"
import { JsonFileImportButton } from "./JsonFileImportButton"
import { navbarButtonStyle } from "./styleConstants"

interface Props {
  color?: string
  handleCloseNavMenu?: () => void
}

type ExportFormat = "SVG" | "PNG" | "PDF" | "JSON"

/** A succeeded-but-degraded signal an export can return (PNG downscale today). */
type ExportRunResult = { clamped?: boolean; appliedScale?: number }

function exportSuccessMessage(
  format: ExportFormat,
  result: ExportRunResult | void
): string {
  if (result?.clamped) {
    const scale =
      typeof result.appliedScale === "number"
        ? ` (rendered at ${Math.round(result.appliedScale * 100)}%)`
        : ""
    return `${format} downscaled to fit memory limits${scale}.`
  }
  return `${format} exported.`
}

function exportErrorMessage(format: ExportFormat, err: unknown): string {
  // Match by name, not `instanceof`, so the navbar doesn't statically import the
  // library's (font-heavy) export entry just for the type — keeping it out of
  // the editor route's bundle.
  if ((err as Error)?.name === "RasterTooLargeError") {
    return "Diagram is too large to export as PNG. Try SVG or PDF instead."
  }
  return `${format} export failed. Please try again.`
}

export const NavbarFile: FC<Props> = ({ color, handleCloseNavMenu }) => {
  const { openModal } = useModalContext()
  const exportAsSvg = useExportAsSVG("compat")
  const exportAsPng = useExportAsPNG()
  const exportAsJSON = useExportAsJSON()
  const exportAsPDF = useExportAsPDF()
  const [open, setOpen] = useState(false)
  // Global re-entry lock: while any export runs, `runExport` ignores further
  // clicks (they share the editor's SVG extraction). The per-item `disabled`
  // below is just the visual cue on the format in flight.
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    handleCloseNavMenu?.()
  }, [handleCloseNavMenu])

  const handleNewDiagram = useCallback(() => {
    openModal("NEW_DIAGRAM", { dialogVariant: "home" })
    close()
  }, [openModal, close])

  // Every export takes the same path: one toast that shows "Exporting…" while
  // it runs, then resolves in place to success or error. Uniform across all
  // formats (no silent successes, no spinner that just vanishes) and fixes
  // #667's signature symptom — a silent no-op. A PNG downscaled to fit the
  // pixel budget reports that in its success message.
  const runExport = useCallback(
    async (
      format: ExportFormat,
      action: () => Promise<ExportRunResult | void>
    ) => {
      if (busyFormat) return
      close()
      setBusyFormat(format)
      try {
        await toast.promise(action(), {
          pending: `Exporting ${format}…`,
          success: {
            render: ({ data }) => exportSuccessMessage(format, data),
          },
          error: {
            render: ({ data }) => exportErrorMessage(format, data),
          },
        })
      } catch (err) {
        // toast.promise already surfaced the error toast; keep a log for triage.
        log.error("export failed", err as Error)
      } finally {
        setBusyFormat(null)
      }
    },
    [busyFormat, close]
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id="file-menu-button"
        className={navbarButtonStyle()}
        style={color ? { color } : undefined}
      >
        <span>File</span>
        <ChevronDownIcon className="ml-1 size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent aria-labelledby="file-menu-button">
        <DropdownMenuItem onClick={handleNewDiagram}>
          New Diagram
        </DropdownMenuItem>
        {/* Templates are a tab in the New Diagram dialog, and the dashboard is
            the diagram loader — so no "Start from Template"/"Load Diagram" here.
            Version history has its own VersionHistoryButton. */}
        <JsonFileImportButton close={close} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger id="export-sub-menu-button">
            Export
            <ChevronRightIcon className="ml-auto size-4" aria-hidden />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent aria-labelledby="export-sub-menu-button">
            <DropdownMenuItem
              onClick={() => runExport("SVG", async () => exportAsSvg())}
            >
              As SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={busyFormat === "PNG"}
              onClick={() =>
                runExport("PNG", () =>
                  exportAsPng({ setWhiteBackground: true })
                )
              }
            >
              As PNG (White Background)
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={busyFormat === "PNG"}
              onClick={() =>
                runExport("PNG", () =>
                  exportAsPng({ setWhiteBackground: false })
                )
              }
            >
              As PNG (Transparent Background)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => runExport("JSON", async () => exportAsJSON())}
            >
              As JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={busyFormat === "PDF"}
              onClick={() => runExport("PDF", exportAsPDF)}
            >
              As PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                openModal("EXPORT_PPTX")
                close()
              }}
            >
              As PPTX (Presentation)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
