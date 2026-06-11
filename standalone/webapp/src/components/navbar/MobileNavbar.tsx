import React, { useEffect, useRef, useState } from "react"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Toolbar from "@mui/material/Toolbar"
import IconButton from "@mui/material/IconButton"
import Typography from "@mui/material/Typography"
import Menu from "@mui/material/Menu"
import MenuIcon from "@mui/icons-material/Menu"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { VersionHistoryButton } from "./VersionHistoryButton"
import Button from "@mui/material/Button/Button"
import { BrandAndVersion } from "./BrandAndVersion"
import { useEditorContext, useModalContext } from "@/contexts"
import TextField from "@mui/material/TextField/TextField"
import { useNavigate } from "react-router"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_SX } from "./styleConstants"

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
    if (!editor) {
      unsubscribe.current = undefined
      return
    }

    unsubscribe.current = editor.subscribeToDiagramNameChange((title) => {
      setDiagramTitle(title)
    })
    setDiagramTitle(editor.getDiagramMetadata().diagramTitle || "")

    return () => {
      if (unsubscribe.current !== undefined) {
        editor.unsubscribe(unsubscribe.current)
        unsubscribe.current = undefined
      }
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
    <AppBar position="sticky" sx={NAVBAR_SX} elevation={0}>
      <Toolbar disableGutters sx={{ minHeight: 64 }}>
        <Box
          sx={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          {/* Mobile Menu Button */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              size="large"
              aria-label="navigation menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
              sx={{ ml: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                horizontal: "center",
                vertical: "bottom",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
            >
              {/* Interactive Menu Items */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.25,
                  alignItems: "flex-start",
                }}
              >
                <Button
                  sx={{ textTransform: "none" }}
                  onClick={() => {
                    handleCloseNavMenu()
                    goHome()
                  }}
                >
                  <Typography color="var(--apollon-primary-contrast)">
                    All Diagrams
                  </Typography>
                </Button>
                <NavbarFile
                  color="var(--apollon-primary-contrast)"
                  handleCloseNavMenu={handleCloseNavMenu}
                />
                <Button
                  sx={{ textTransform: "none" }} // This removes the uppercase transformation
                  onClick={() => openModal("SHARE")}
                >
                  <Typography color="var(--apollon-primary-contrast)">
                    Share
                  </Typography>
                </Button>
                <VersionHistoryButton color="var(--apollon-primary-contrast)" />
                <NavbarHelp color="var(--apollon-primary-contrast)" />

                {/* Diagram Name Input Field */}
                <Box sx={{ p: 0.5 }}>
                  <TextField
                    value={diagramTitle}
                    onChange={(event) => {
                      const newTitle = event.target.value
                      editor?.updateDiagramTitle(newTitle)
                      setDiagramTitle(newTitle)
                    }}
                    placeholder="Diagram Name"
                    fullWidth
                    sx={{
                      input: {
                        padding: 0.5,
                        color: "var(--apollon-primary-contrast)",
                      },
                    }}
                    variant="outlined"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  />
                </Box>
              </Box>
            </Menu>
          </Box>

          {/* Mobile Title and Version */}
          <button
            type="button"
            onClick={goHome}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            <BrandAndVersion />
          </button>

          <ThemeSwitcherMenu />
        </Box>
      </Toolbar>
    </AppBar>
  )
}
