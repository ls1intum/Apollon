import { useState, MouseEvent, FC, useCallback } from "react"
import Button from "@mui/material/Button"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { toast } from "react-toastify"
import { MOBILE_VIEW_QUERY } from "@/constants"
import { useModalContext } from "@/contexts"
import { navbarButtonStyle } from "./styleConstants"
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
  // Two independent concerns: how the submenu opens, and which way it opens.
  // Open on click (not hover) when there's no reliable hover — i.e. touch.
  const isTouchInput = useMediaQuery("(hover: none), (pointer: coarse)")
  // Open the submenu leftward only inside the mobile overflow menu (anchored
  // near the right edge). Keying off the shared MOBILE_VIEW_QUERY keeps the
  // header's right-opening submenu on narrow-but-tall viewports (e.g. 900x800),
  // where left-opening would push it off-screen.
  const isMobileMenu = useMediaQuery(MOBILE_VIEW_QUERY)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(
    null
  )
  // Global re-entry lock: while any export runs, `runExport` ignores further
  // clicks (they share the editor's SVG extraction). The per-item `disabled`
  // below is just the visual cue on the format in flight.
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
  }, [handleCloseNavMenu])

  const openSubMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    setSubMenuAnchorEl(event.currentTarget)
  }, [])

  const openSubMenuFromClick = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation()
    setSubMenuAnchorEl(event.currentTarget)
  }, [])

  const handleNewDiagram = useCallback(() => {
    openModal("NEW_DIAGRAM", { dialogVariant: "home" })
    closeMainMenu()
  }, [openModal, closeMainMenu])

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
      closeMainMenu()
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
        sx={navbarButtonStyle(color)}
      >
        <Typography color="inherit" component="span">
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
          id="export-sub-menu-button"
          onClick={openSubMenuFromClick}
          onMouseEnter={isTouchInput ? undefined : openSubMenu}
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
        anchorOrigin={{
          vertical: "top",
          horizontal: isMobileMenu ? "left" : "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: isMobileMenu ? "right" : "left",
        }}
        MenuListProps={{
          "aria-labelledby": "export-sub-menu-button",
          onMouseLeave: isTouchInput
            ? undefined
            : () => setSubMenuAnchorEl(null),
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
