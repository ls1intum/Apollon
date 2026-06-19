import { useState, MouseEvent, FC, useCallback } from "react"
import Button from "@mui/material/Button"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import useMediaQuery from "@mui/material/useMediaQuery"
import { MOBILE_VIEW_QUERY } from "@/constants"
import { useModalContext } from "@/contexts"
import { navbarButtonStyle } from "./styleConstants"
import {
  useExportAsJSON,
  useExportAsPNG,
  useExportAsSVG,
  useExportAsPDF,
} from "@/hooks"
import { JsonFileImportButton } from "./JsonFileImportButton"
import { KeyboardArrowDownIcon } from "../Icon"

interface Props {
  color?: string
  handleCloseNavMenu?: () => void
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
  // Open the submenu leftward only in the actual mobile hamburger context
  // (where the menu is anchored near the right edge). Keying off the shared
  // MOBILE_VIEW_QUERY — the same one that swaps in MobileNavbar — keeps the
  // desktop navbar's right-opening submenu on narrow-but-tall viewports
  // (e.g. 900x800), where left-opening would push it off-screen.
  const isMobileMenu = useMediaQuery(MOBILE_VIEW_QUERY)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [subMenuAnchorEl, setSubMenuAnchorEl] = useState<null | HTMLElement>(
    null
  )

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
        <MenuItem
          onClick={() => {
            exportAsSvg()
            closeMainMenu()
          }}
        >
          As SVG
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportAsPng({ setWhiteBackground: true })
            closeMainMenu()
          }}
        >
          As PNG (White Background)
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportAsPng({ setWhiteBackground: false })
            closeMainMenu()
          }}
        >
          As PNG (Transparent Background)
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportAsJSON()
            closeMainMenu()
          }}
        >
          As JSON
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportAsPDF()
            closeMainMenu()
          }}
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
