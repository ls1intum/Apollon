import { useState, MouseEvent, FC, useCallback } from "react"
import Button from "@mui/material/Button"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import { toast } from "react-toastify"
import { secondary } from "@/constants"
import { useModalContext } from "@/contexts"
import {
  useExportAsJSON,
  useExportAsPNG,
  useExportAsSVG,
  useExportAsPDF,
} from "@/hooks"
import { log } from "@/logger"
import { RasterTimeoutError, RasterTooLargeError } from "@/utils/exportErrors"
import { JsonFileImportButton } from "./JsonFileImportButton"
import { KeyboardArrowDownIcon } from "../Icon"

interface Props {
  color?: string
  handleCloseNavMenu?: () => void
}

type ExportFormat = "SVG" | "PNG" | "PDF" | "JSON"

/**
 * Optional "warning, succeeded but degraded" signal an action can return.
 * Today only the PNG raster path uses it (clamp to 32 MP), but the type leaves
 * room for future formats.
 */
type ExportRunResult = {
  clamped?: boolean
  appliedScale?: number
}

const formatExportError = (format: ExportFormat, err: unknown): string => {
  // Only the raster pipeline (PNG) can produce these typed errors today.
  // PDF is vector and can't run out of canvas memory; SVG/JSON never raster.
  if (format === "PNG") {
    if (err instanceof RasterTooLargeError) {
      return "Diagram is too large to export as PNG. Try SVG or PDF instead."
    }
    if (err instanceof RasterTimeoutError) {
      return "PNG export timed out. Please try again."
    }
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
  // Prevents double-fire when the user clicks an export item rapidly. Tracked
  // per format so a slow PNG render doesn't block PDF/SVG/JSON.
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

  const handleNewFile = useCallback(() => {
    openModal("NEW_DIAGRAM")
    closeMainMenu()
  }, [openModal, closeMainMenu])

  const handleStartFromTemplate = useCallback(() => {
    openModal("NEW_DIAGRAM_FROM_TEMPLATE")
    closeMainMenu()
  }, [openModal, closeMainMenu])

  const runExport = useCallback(
    async (
      format: ExportFormat,
      action: () => Promise<ExportRunResult | void>
    ) => {
      if (busyFormat === format) return
      closeMainMenu()
      setBusyFormat(format)
      const start = performance.now()
      log.debug("export.start", { format })
      // Show a progress toast for the rasterising paths (PNG/PDF) which can
      // take seconds on a large diagram. SVG/JSON are sub-millisecond — the
      // toast would be visual noise.
      const progressToastId =
        format === "PNG" || format === "PDF"
          ? toast.info(`Exporting ${format}…`, {
              autoClose: false,
              isLoading: true,
            })
          : undefined
      try {
        const result = (await action()) ?? undefined
        log.debug("export.success", {
          format,
          durationMs: Math.round(performance.now() - start),
          clamped: result?.clamped ?? false,
        })
        if (result?.clamped) {
          toast.warning(
            `${format} downsized to fit memory limits` +
              (typeof result.appliedScale === "number"
                ? ` (rendered at ${Math.round(result.appliedScale * 100)}%).`
                : "."),
            { autoClose: 6_000 }
          )
        }
      } catch (err) {
        log.error("export.fail", {
          format,
          errorName: (err as Error)?.name,
          message: (err as Error)?.message,
          durationMs: Math.round(performance.now() - start),
        })
        toast.error(formatExportError(format, err))
      } finally {
        if (progressToastId !== undefined) toast.dismiss(progressToastId)
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
        <MenuItem onClick={handleNewFile}>New File</MenuItem>
        <MenuItem onClick={handleStartFromTemplate}>
          Start from Template
        </MenuItem>
        <MenuItem
          onClick={() => {
            openModal("LOAD_DIAGRAM")
            closeMainMenu()
          }}
        >
          Load Diagram
        </MenuItem>
        {/* Version history lives in its own dedicated nav button
            (`<VersionHistoryButton>`), not here — it had been duplicated
            in the File menu for discoverability, but the standalone
            button is more visible and hosting it twice meant the menu
            entry felt like it "did nothing" from the user's POV
            (clicking either toggles the same drawer). One source. */}
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
        <MenuItem
          onClick={() => runExport("SVG", exportAsSvg)}
          disabled={busyFormat === "SVG"}
        >
          As SVG
        </MenuItem>
        <MenuItem
          onClick={() =>
            runExport("PNG", () => exportAsPng({ setWhiteBackground: true }))
          }
          disabled={busyFormat === "PNG"}
        >
          As PNG (White Background)
        </MenuItem>
        <MenuItem
          onClick={() =>
            runExport("PNG", () => exportAsPng({ setWhiteBackground: false }))
          }
          disabled={busyFormat === "PNG"}
        >
          As PNG (Transparent Background)
        </MenuItem>
        <MenuItem
          onClick={() =>
            runExport("JSON", async () => {
              exportAsJSON()
            })
          }
          disabled={busyFormat === "JSON"}
        >
          As JSON
        </MenuItem>
        <MenuItem
          onClick={() => runExport("PDF", exportAsPDF)}
          disabled={busyFormat === "PDF"}
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
