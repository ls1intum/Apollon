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
import { BrandAndVersion } from "./BrandAndVersion"
import { BackNav } from "./BackNav"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { secondary } from "@/constants"
import { useEffect, useRef, useState } from "react"
import { useModalContext, useEditorContext } from "@/contexts"
import { Link } from "react-router"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { NAVBAR_SX } from "./styleConstants"

export const DesktopNavbar = () => {
  const { editor } = useEditorContext()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const unsubscribeId = useRef<number>()
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
        sx={{
          width: "100%",
          minHeight: 64,
          px: 2,
          gap: 2,
        }}
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
          <BackNav to="/" label={ALL_DIAGRAMS_LABEL} tone="onDark" />
          <NavbarFile />
          <Button
            sx={{ textTransform: "none" }} // This removes the uppercase transformation
            onClick={() => openModal("SHARE")}
          >
            <Typography color={secondary}>Share</Typography>
          </Button>
          <NavbarHelp />
          <TextField
            sx={{
              input: { color: "white", padding: 1 },
              marginLeft: 1,
              maxWidth: 360,
            }}
            value={diagramTitle}
            onChange={(event) => {
              const newTitle = event.target.value
              editor?.updateDiagramTitle(newTitle)
              setDiagramTitle(newTitle)
            }}
            placeholder="Diagram Name"
            variant="outlined"
          />

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ marginLeft: "auto" }}
          >
            <VersionHistoryButton />
            <ThemeSwitcherMenu />
          </Stack>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
