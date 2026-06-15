import { NAVBAR_BACKGROUND_COLOR } from "@/constants"
import { useEditorContext, useModalContext } from "@/contexts"
import MenuIcon from "@mui/icons-material/Menu"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import TextField from "@mui/material/TextField/TextField"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
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
      position="static"
      sx={{
        bgcolor: NAVBAR_BACKGROUND_COLOR,
        flexShrink: 0,
        pt: "var(--safe-area-inset-top, 0px)",
      }}
      elevation={0}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: "44px !important",
          height: 44,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "center",
            minWidth: 0,
            pl: "calc(10px + var(--safe-area-inset-left, 0px))",
            pr: "calc(6px + var(--safe-area-inset-right, 0px))",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={goHome}
          >
            <img alt="Logo" src={TumLogo} width="46" height="23" />
          </div>

          <Typography
            noWrap
            sx={{
              flex: 1,
              minWidth: 0,
              mx: 1.5,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {diagramTitle || "Apollon"}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              id="mobile-options-button"
              size="small"
              aria-label="open options"
              aria-controls="mobile-options-menu"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
              sx={{ width: 36, height: 36 }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            <Menu
              id="mobile-options-menu"
              anchorEl={anchorElNav}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              MenuListProps={{
                "aria-labelledby": "mobile-options-button",
                sx: { py: 0.5 },
              }}
              slotProps={{
                paper: {
                  sx: {
                    width: 240,
                    maxWidth:
                      "calc(100vw - var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px) - 16px)",
                  },
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  "& > .MuiButton-root, & > .MuiMenuItem-root": {
                    boxSizing: "border-box",
                    width: "100%",
                    minHeight: 42,
                    justifyContent: "flex-start",
                    px: 2,
                    borderRadius: 0,
                    color: "var(--apollon-primary-contrast, #000000)",
                    fontSize: 16,
                  },
                  "& > .MuiButton-root > svg:last-of-type": {
                    ml: "auto !important",
                  },
                }}
              >
                <NavbarFile
                  color="var(--apollon-primary-contrast, #000000)"
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
                <VersionHistoryButton color="var(--apollon-primary-contrast, #000000)" />
                <NavbarHelp color="var(--apollon-primary-contrast, #000000)" />
                <ThemeSwitcherMenu asMenuItem onToggle={handleCloseNavMenu} />
                <Box sx={{ px: 1.5, py: 1 }}>
                  <TextField
                    value={diagramTitle}
                    onChange={(event) => {
                      const newTitle = event.target.value
                      editor?.updateDiagramTitle(newTitle)
                      setDiagramTitle(newTitle)
                    }}
                    placeholder="Diagram Name"
                    fullWidth
                    size="small"
                    inputProps={{ "aria-label": "Diagram name" }}
                    sx={{ input: { py: 1, px: 1.25 } }}
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
