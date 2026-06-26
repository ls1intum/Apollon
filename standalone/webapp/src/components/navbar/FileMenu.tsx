import { FC, useCallback, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@tumaet/ui/components/dropdown-menu"
import { Button } from "@tumaet/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { ChevronDownIcon, FilesIcon } from "lucide-react"
import { toast } from "react-toastify"
import { useModalContext } from "@/contexts"
import { useMediaQuery } from "@/hooks"
import {
  useExportAsJSON,
  useExportAsPDF,
  useExportAsPNG,
  useExportAsSVG,
} from "@/hooks"
import { log } from "@/logger"
import { JsonFileImportButton } from "./JsonFileImportButton"
import { navbarButtonStyle } from "./styleConstants"
import { MOBILE_MENU_CONTENT_CLASS } from "./islandPrimitives"

interface FileMenuProps {
  color?: string
  onClose?: () => void
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

/**
 * The shared File-menu LEAVES — New Diagram, Import, and the Export formats —
 * rendered as FLAT `DropdownMenuItem`s (mirroring `HelpMenuItems`). Export is a
 * single labelled `DropdownMenuGroup`, NOT a nested submenu: the chrome caps menu
 * nesting at ONE level, so the same body drops cleanly into the desktop File
 * dropdown AND inlines into the editor mobile overflow without ever becoming a
 * menu-inside-a-menu.
 *
 * Owns the export hooks + the global re-entry lock so the desktop and mobile
 * surfaces share one source of behaviour. `onSelect` closes the surrounding menu
 * after a non-export leaf is chosen.
 */
export function FileMenuItems({ onSelect }: { onSelect: () => void }) {
  const { openModal } = useModalContext()
  const exportAsSvg = useExportAsSVG("compat")
  const exportAsPng = useExportAsPNG()
  const exportAsJSON = useExportAsJSON()
  const exportAsPDF = useExportAsPDF()
  // Global re-entry lock: while any export runs, `runExport` ignores further
  // clicks (they share the editor's SVG extraction). The per-item `disabled`
  // below is just the visual cue on the format in flight.
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null)

  const handleNewDiagram = useCallback(() => {
    openModal("NEW_DIAGRAM", { dialogVariant: "home" })
    onSelect()
  }, [openModal, onSelect])

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
      onSelect()
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
    [busyFormat, onSelect]
  )

  return (
    <>
      <DropdownMenuItem onClick={handleNewDiagram}>
        New Diagram
      </DropdownMenuItem>
      {/* Templates are a tab in the New Diagram dialog, and the dashboard is
          the diagram loader — so no "Start from Template"/"Load Diagram" here.
          Version history has its own VersionHistoryButton. */}
      <JsonFileImportButton close={onSelect} />
      <DropdownMenuSeparator />
      {/* Export is ONE labelled group of flat leaves — never a 2nd-level submenu
          (the chrome caps nesting at one level). */}
      <DropdownMenuGroup>
        <DropdownMenuLabel>Export</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => runExport("SVG", async () => exportAsSvg())}
        >
          As SVG
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busyFormat === "PNG"}
          onClick={() =>
            runExport("PNG", () => exportAsPng({ setWhiteBackground: true }))
          }
        >
          As PNG (White Background)
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busyFormat === "PNG"}
          onClick={() =>
            runExport("PNG", () => exportAsPng({ setWhiteBackground: false }))
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
            onSelect()
          }}
        >
          As PPTX (Presentation)
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

export const FileMenu: FC<FileMenuProps> = ({ color, onClose }) => {
  const [open, setOpen] = useState(false)
  // Label visible at `lg` ⇒ the tooltip would just repeat it, so disable it then.
  const isLg = useMediaQuery("(min-width: 1024px)")

  const close = useCallback(() => {
    setOpen(false)
    onClose?.()
  }, [onClose])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip disabled={isLg}>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              id="file-menu-button"
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={navbarButtonStyle()}
                  style={color ? { color } : undefined}
                  aria-label="File"
                />
              }
            >
              <FilesIcon className="size-4" aria-hidden />
              <span className="hidden lg:inline">File</span>
              <ChevronDownIcon className="size-4" aria-hidden />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent>File</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        aria-labelledby="file-menu-button"
        className={MOBILE_MENU_CONTENT_CLASS}
      >
        <FileMenuItems onSelect={close} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
