import { useState, MouseEvent, FC, useCallback } from "react"
import Button from "@mui/material/Button"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import { toast } from "react-toastify"
import { RasterTooLargeError, RasterTimeoutError } from "@tumaet/apollon/export"
import { secondary } from "@/constants"
import { useModalContext } from "@/contexts"
import {
  useExportAsJSON,
  useExportAsPNG,
  useExportAsSVG,
  useExportAsPDF,
} from "@/hooks"
import { log } from "@/logger"
import { JsonFileImportButton } from "./JsonFileImportButton"
import { KeyboardArrowDownIcon } from "../Icon"

interface Props {
  color?: string
  handleCloseNavMenu?: () => void
}

type ExportFormat = "SVG" | "PNG" | "PDF" | "JSON"

/** A succeeded-but-degraded signal an export can return (PNG downscale today). */
type ExportRunResult = { clamped?: boolean; appliedScale?: number }

function exportErrorMessage(format: ExportFormat, err: unknown): string {
  if (err instanceof RasterTooLargeError) {
    return "Diagram is too large to export as PNG. Try SVG or PDF instead."
  }
  if (err instanceof RasterTimeoutError) {
    return "PNG export timed out. Please try again."
  }
  return `${format} export failed. Please try again.`
}

export const NavbarFile: FC<Props> = ({ color, handleCloseNavMenu }) => {
  const { openModal } = useModalContext()
  const exportAsSvg = useExportAsSVG("compat")
  const exportAsPng = useExportAsPNG()
  const exportAsJSON = useExportAsJSON()
  const exportAsPDF = useExportAsPDF()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(
    null
  )
  // Guards against a second click re-firing a slow render. Per-format so a slow
  // PNG doesn't block PDF/SVG/JSON.
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null)

  const isMenuOpen = Boolean(anchorEl)
  const isSubMenuOpen = Boolean(subMenuAnchorEl)

  const openMainMenu = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }, [])

  const closeMainMenu = useCallback(() => {
    handleCloseNavMenu?.()
    setAnchorEl(null)
    setSubMenuAnchorEl(null)
  }, [])

  const openSubMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    setSubMenuAnchorEl(event.currentTarget)
  }, [])

  const handleNewDiagram = useCallback(() => {
    openModal("NEW_DIAGRAM")
    closeMainMenu()
  }, [openModal, closeMainMenu])

  // Runs an export with the menu closed, surfacing failures as a toast — the
  // fix for #667's signature symptom, a silent no-op. PNG/PDF get a progress
  // toast since they can take seconds on a large diagram.
  const runExport = useCallback(
    async (
      format: ExportFormat,
      action: () => Promise<ExportRunResult | void>
    ) => {
      if (busyFormat) return
      closeMainMenu()
      setBusyFormat(format)
      const progressId =
        format === "PNG" || format === "PDF"
          ? toast.info(`Exporting ${format}…`, {
              autoClose: false,
              isLoading: true,
            })
          : undefined
      try {
        const result = (await action()) ?? undefined
        if (result?.clamped) {
          toast.warning(
            `${format} downscaled to fit memory limits` +
              (typeof result.appliedScale === "number"
                ? ` (rendered at ${Math.round(result.appliedScale * 100)}%).`
                : ".")
          )
        }
      } catch (err) {
        log.error("export failed", err as Error)
        toast.error(exportErrorMessage(format, err))
      } finally {
        if (progressId !== undefined) toast.dismiss(progressId)
        setBusyFormat(null)
      }
    },
    [busyFormat, closeMainMenu]
  )

  return (
    <>
      <Button
        id="file-menu-button"
        aria-controls={isMenuOpen ? "file-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={isMenuOpen ? "true" : undefined}
        onClick={openMainMenu}
        sx={{ textTransform: "none" }}
      >
        <Typography color={color ?? secondary} component="span">
          File
        </Typography>
        <KeyboardArrowDownIcon
          width={16}
          height={16}
          style={{ marginLeft: 4 }}
        />
      </Button>
      <Menu
        id="file-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={closeMainMenu}
        MenuListProps={{
          "aria-labelledby": "file-menu-button",
        }}
      >
        <MenuItem onClick={handleNewDiagram}>New Diagram</MenuItem>
        {/* Templates are a tab in the New Diagram dialog, and the dashboard is
            the diagram loader — so no "Start from Template"/"Load Diagram" here.
            Version history has its own VersionHistoryButton. */}
        <JsonFileImportButton close={closeMainMenu} />
        <MenuItem
          onClick={openSubMenu}
          onMouseEnter={openSubMenu}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
          aria-haspopup="true"
          aria-controls={isSubMenuOpen ? "export-sub-menu" : undefined}
          aria-expanded={isSubMenuOpen ? "true" : undefined}
        >
          Export
          <KeyboardArrowDownIcon
            style={{ marginLeft: 4, transform: "rotate(-90deg)" }}
          />
        </MenuItem>
      </Menu>
      <Menu
        id="export-sub-menu"
        anchorEl={subMenuAnchorEl}
        open={isSubMenuOpen}
        onClose={closeMainMenu}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        MenuListProps={{
          "aria-labelledby": "export-sub-menu-button",
          onMouseLeave: () => setSubMenuAnchorEl(null),
        }}
      >
        <MenuItem onClick={() => runExport("SVG", async () => exportAsSvg())}>
          As SVG
        </MenuItem>
        <MenuItem
          disabled={busyFormat === "PNG"}
          onClick={() =>
            runExport("PNG", () => exportAsPng({ setWhiteBackground: true }))
          }
        >
          As PNG (White Background)
        </MenuItem>
        <MenuItem
          disabled={busyFormat === "PNG"}
          onClick={() =>
            runExport("PNG", () => exportAsPng({ setWhiteBackground: false }))
          }
        >
          As PNG (Transparent Background)
        </MenuItem>
        <MenuItem onClick={() => runExport("JSON", async () => exportAsJSON())}>
          As JSON
        </MenuItem>
        <MenuItem
          disabled={busyFormat === "PDF"}
          onClick={() => runExport("PDF", exportAsPDF)}
        >
          As PDF
        </MenuItem>
        <MenuItem
          onClick={() => {
            openModal("EXPORT_PPTX")
            closeMainMenu()
          }}
        >
          As PPTX (Presentation)
        </MenuItem>
      </Menu>
    </>
  )
}
