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
import { NAVBAR_BACKGROUND_COLOR, secondary } from "@/constants"
import TumLogo from "assets/images/tum-logo.png"
import { useEffect, useRef, useState } from "react"
import { useModalContext, useEditorContext } from "@/contexts"
import { useNavigate } from "react-router"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"

export const DesktopNavbar = () => {
  const { editor } = useEditorContext()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const unsubscribeId = useRef<number>()
  const { openModal } = useModalContext()
  const navigate = useNavigate()

  const goHome = () => {
    navigate("/")
  }

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
    <AppBar
      position="static"
      sx={{
        bgcolor: NAVBAR_BACKGROUND_COLOR,
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        px: 2,
      }}
      elevation={0}
    >
      <Toolbar disableGutters>
        <button
          type="button"
          onClick={goHome}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            color: "inherit",
            font: "inherit",
          }}
        >
          <img
            alt="TU Munich logo"
            src={TumLogo}
            width="60"
            height="30"
            style={{ marginRight: 10 }}
          />

          <BrandAndVersion />
        </button>

        {/* Spacer */}
        <Box
          sx={{
            flexGrow: 1,
            pl: 2,
            gap: 2,
            alignItems: "center",
          }}
        >
          <NavbarFile />
          <Button
            sx={{ textTransform: "none" }} // This removes the uppercase transformation
            onClick={() => openModal("SHARE")}
          >
            <Typography color={secondary}>Share</Typography>
          </Button>
          <NavbarHelp />
          <TextField
            sx={{ input: { color: "white", padding: 1 }, marginLeft: 1 }}
            value={diagramTitle}
            onChange={(event) => {
              const newTitle = event.target.value
              editor?.updateDiagramTitle(newTitle)
              setDiagramTitle(newTitle)
            }}
            placeholder="Diagram Name"
            variant="outlined"
          />
        </Box>
      </Toolbar>
      {/* Right cluster: version history sits immediately to the left of the
          theme toggle so it's the rightmost product affordance. */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <VersionHistoryButton />
        <ThemeSwitcherMenu />
      </Stack>
    </AppBar>
  )
}
