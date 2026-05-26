import { NAVBAR_BACKGROUND_COLOR } from "@/constants"
import { useEditorContext, useModalContext } from "@/contexts"
import MenuIcon from "@mui/icons-material/Menu"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import TextField from "@mui/material/TextField/TextField"
import Toolbar from "@mui/material/Toolbar"
import TumLogo from "assets/images/tum-logo.png"
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { MenuItem } from "@mui/material"

export default function MobileNavbar() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null)
  const { editor } = useEditorContext()
  const { openModal } = useModalContext()
  const navigate = useNavigate()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const unsubscribe = useRef<number>()

  useEffect(() => {
    if (editor && !unsubscribe.current) {
      unsubscribe.current = editor.subscribeToDiagramNameChange(
        (diagramTitle) => {
          setDiagramTitle(diagramTitle)
        }
      )
    }
    // Update diagram title when editor is available
    if (editor) {
      setDiagramTitle(editor.getDiagramMetadata().diagramTitle || "")
    }
  }, [editor])

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget)
  }

  const handleCloseNavMenu = () => {
    setAnchorElNav(null)
  }

  const goHome = () => {
    navigate("/")
  }
  return (
    <AppBar
      position="fixed"
      sx={{ bgcolor: NAVBAR_BACKGROUND_COLOR, top: 0, left: 0, right: 0 }}
      elevation={0}
    >
      <Toolbar disableGutters>
        <Box
          sx={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          {/* Left: Logo only */}
          <div
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={goHome}
          >
            <img alt="Logo" src={TumLogo} width="60" height="30" />
          </div>

          {/* Right: Options dropdown (File/Import/Export/Theme/Share/Help/Version) */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton
              size="large"
              aria-label="open options"
              aria-controls="mobile-options-menu"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="mobile-options-menu"
              anchorEl={anchorElNav}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <NavbarFile
                  color="black"
                  handleCloseNavMenu={handleCloseNavMenu}
                />
                <MenuItem
                  onClick={() => {
                    openModal("SHARE")
                    handleCloseNavMenu()
                  }}
                >
                  Share
                </MenuItem>
                <VersionHistoryButton color="black" />
                <NavbarHelp color="black" />
                <MenuItem onClick={handleCloseNavMenu}>
                  <ThemeSwitcherMenu />
                </MenuItem>
                <Box sx={{ px: 1 }}>
                  <TextField
                    value={diagramTitle}
                    onChange={(event) => {
                      const newTitle = event.target.value
                      editor?.updateDiagramTitle(newTitle)
                      setDiagramTitle(newTitle)
                    }}
                    placeholder="Diagram Name"
                    fullWidth
                    sx={{ input: { padding: 0.5 } }}
                    variant="outlined"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                </Box>
              </Box>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
