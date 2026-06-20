import React, { useEffect, useRef, useState } from "react"
import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import TextField from "@mui/material/TextField"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import MenuIcon from "@mui/icons-material/Menu"
import TumLogo from "assets/images/tum-logo.png"
import { Link } from "@tanstack/react-router"
import { useEditorContext, useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BackNav } from "./BackNav"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { NAVBAR_SX, NAVBAR_TOOLBAR_SX } from "./styleConstants"

export default function MobileNavbar() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null)
  const { editor } = useEditorContext()
  const { openModal } = useModalContext()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const unsubscribe = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!editor) {
      unsubscribe.current = undefined
      return
    }

    unsubscribe.current = editor.subscribeToDiagramNameChange(
      (title: string) => {
        setDiagramTitle(title)
      }
    )
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

  return (
    <AppBar
      position="sticky"
      sx={{
        ...NAVBAR_SX,
        flexShrink: 0,
        pt: "var(--safe-area-inset-top, 0px)",
        "@media (max-width: 950px) and (max-height: 500px)": {
          pt: 0,
        },
      }}
      elevation={0}
    >
      {/* Unified app-header height (NAVBAR_TOOLBAR_SX, 52px) in portrait, but
          stay compact in phone-landscape where vertical canvas space is scarce. */}
      <Toolbar
        disableGutters
        sx={{
          ...NAVBAR_TOOLBAR_SX,
          "@media (max-width: 950px) and (max-height: 500px)": {
            minHeight: "36px !important",
            height: 36,
          },
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
            "@media (max-width: 950px) and (max-height: 500px)": {
              pl: "calc(32px + var(--safe-area-inset-left, 0px))",
              pr: "calc(32px + var(--safe-area-inset-right, 0px))",
            },
          }}
        >
          <Link
            to="/"
            aria-label="Apollon home"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Box
              component="img"
              alt="Logo"
              src={TumLogo}
              sx={{
                width: 46,
                height: 23,
                "@media (max-width: 950px) and (max-height: 500px)": {
                  width: 40,
                  height: 20,
                },
              }}
            />
          </Link>

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
              "@media (max-width: 950px) and (max-height: 500px)": {
                fontSize: 13,
              },
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
              sx={{
                width: 36,
                height: 36,
                "@media (max-width: 950px) and (max-height: 500px)": {
                  width: 32,
                  height: 32,
                },
              }}
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
                  "& > .MuiButton-root, & > .MuiMenuItem-root, & > a": {
                    boxSizing: "border-box",
                    width: "100%",
                    minHeight: 42,
                    justifyContent: "flex-start",
                    px: 2,
                    borderRadius: 0,
                    color: "var(--apollon-primary-contrast)",
                    fontSize: 16,
                  },
                  "& > .MuiButton-root > svg:last-of-type": {
                    ml: "auto !important",
                  },
                }}
              >
                <BackNav
                  to="/"
                  label={ALL_DIAGRAMS_LABEL}
                  tone="onSurface"
                  onNavigate={handleCloseNavMenu}
                />
                <NavbarFile
                  color="var(--apollon-primary-contrast)"
                  handleCloseNavMenu={handleCloseNavMenu}
                />
                <MenuItem
                  onClick={() => {
                    openModal("SHARE", { dialogVariant: "home" })
                    handleCloseNavMenu()
                  }}
                >
                  Share
                </MenuItem>
                <SaveLocalCopyButton
                  color="var(--apollon-primary-contrast)"
                  onAfter={handleCloseNavMenu}
                />
                <VersionHistoryButton color="var(--apollon-primary-contrast)" />
                <NavbarHelp color="var(--apollon-primary-contrast)" />
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
                    sx={{
                      input: {
                        py: 1,
                        px: 1.25,
                        color: "var(--apollon-primary-contrast)",
                      },
                    }}
                    variant="outlined"
                    onClick={(event) => event.stopPropagation()}
                    onFocus={(event) => event.stopPropagation()}
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
