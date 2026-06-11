import { useState, MouseEvent, FC, useCallback } from "react"
import Button from "@mui/material/Button"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import Typography from "@mui/material/Typography"
import { secondary } from "@/constants"
import { useModalContext } from "@/contexts"
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
  }, [])

  const openSubMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    setSubMenuAnchorEl(event.currentTarget)
  }, [])

  const handleNewDiagram = useCallback(() => {
    openModal("NEW_DIAGRAM")
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
        {/* No separate "Start from Template" — templates are a tab inside the
            New Diagram dialog. And no "Load Diagram": the home dashboard (the
            logo/All-diagrams button returns to it) is where you open existing
            diagrams. Both duplicated other flows and muddled the editor. */}
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
