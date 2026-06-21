import AppBar from "@mui/material/AppBar"
import Box from "@mui/material/Box"
import Stack from "@mui/material/Stack"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { TextField } from "@mui/material"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { BrandAndVersion } from "./BrandAndVersion"
import { BackNav } from "./BackNav"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { useEffect, useRef, useState } from "react"
import { useModalContext, useEditorContext } from "@/contexts"
import { Link } from "@tanstack/react-router"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import {
  NAVBAR_SX,
  NAVBAR_TOOLBAR_SX,
  navbarButtonStyle,
} from "./styleConstants"

export const DesktopNavbar = () => {
  const { editor } = useEditorContext()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const unsubscribeId = useRef<number | undefined>(undefined)
  const { openModal } = useModalContext()

  useEffect(() => {
    if (!editor) {
      unsubscribeId.current = undefined
      return
    }

    unsubscribeId.current = editor.subscribeToDiagramNameChange(
      (diagramTitle) => {
        setDiagramTitle(diagramTitle)
      }
    )
    setDiagramTitle(editor.getDiagramMetadata().diagramTitle || "")

    return () => {
      if (unsubscribeId.current !== undefined) {
        editor.unsubscribe(unsubscribeId.current)
        unsubscribeId.current = undefined
      }
    }
  }, [editor])

  return (
    <AppBar position="sticky" sx={NAVBAR_SX} elevation={0}>
      <Toolbar
        disableGutters
        sx={[NAVBAR_TOOLBAR_SX, { width: "100%", px: 2, gap: 2 }]}
      >
        <Link
          to="/"
          aria-label="Apollon home"
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            color: "inherit",
            font: "inherit",
            textDecoration: "none",
          }}
        >
          <BrandAndVersion />
        </Link>

        {/* Spacer */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            pl: 1.5,
            gap: 2,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <BackNav
            to="/"
            label={ALL_DIAGRAMS_LABEL}
            tone="onDark"
            labelClassName="hidden lg:inline"
          />
          <NavbarFile />
          <Button
            sx={navbarButtonStyle()}
            onClick={() => openModal("SHARE", { dialogVariant: "home" })}
          >
            <Typography color="inherit">Share</Typography>
          </Button>
          <SaveLocalCopyButton labelClassName="hidden lg:inline" />
          <NavbarHelp />
          <TextField
            size="small"
            value={diagramTitle}
            onChange={(event) => {
              const newTitle = event.target.value
              editor?.updateDiagramTitle(newTitle)
              setDiagramTitle(newTitle)
            }}
            placeholder="Diagram Name"
            variant="outlined"
            sx={{
              marginLeft: 1,
              flex: "1 1 auto",
              minWidth: 120,
              maxWidth: 280,
              "& .MuiInputBase-root": { height: 36 },
              "& .MuiInputBase-input": {
                color: "white",
                padding: "6px 10px",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 255, 255, 0.22)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 255, 255, 0.4)",
              },
              "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(255, 255, 255, 0.6)",
              },
            }}
          />

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ marginLeft: "auto" }}
          >
            <VersionHistoryButton labelClassName="hidden lg:inline" />
            <ThemeSwitcherMenu />
          </Stack>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
