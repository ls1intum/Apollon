import React, { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Menu from "@mui/material/Menu"
import TextField from "@mui/material/TextField"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import ShareIcon from "@mui/icons-material/IosShare"
import { Link } from "@tanstack/react-router"
import TumLogo from "assets/images/tum-logo-579x579.png"
import { useEditorContext, useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BackNav } from "./BackNav"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"

/**
 * Mobile editor chrome: two floating glass pills (same regions + material as the
 * desktop islands), compact enough that the <header> landmark fits the
 * phone-landscape ≤36px height budget.
 */
const PILL_SX = {
  display: "flex",
  alignItems: "center",
  gap: "var(--apollon-chrome-gap)",
  // Same shared cluster height as every other floating control (coarse: 40px;
  // 36px in phone-landscape via the app.css media override).
  height: "var(--apollon-chrome-island-h)",
  px: "var(--apollon-chrome-pad)",
  py: 0,
  boxSizing: "border-box",
  pointerEvents: "auto",
  maxWidth: "100%",
  minWidth: 0,
} as const

function PillDivider() {
  return (
    <Box
      aria-hidden
      sx={{
        alignSelf: "stretch",
        width: "1px",
        my: "3px",
        mx: 0.25,
        backgroundColor: "var(--apollon-chrome-border)",
      }}
    />
  )
}

/**
 * Top-left: brand + an ALWAYS-visible back affordance (HIG: a standard,
 * always-available back). Rendered as the single <header role="banner"> so the
 * "All diagrams" link stays scoped to the banner landmark.
 */
export function MobileBrandPill() {
  return (
    <Box
      component="header"
      role="banner"
      aria-label="Editor"
      className="apollon-glass apollon-chrome-island"
      sx={PILL_SX}
    >
      <Link
        to="/"
        aria-label="Apollon home"
        style={{ display: "flex", alignItems: "center" }}
      >
        <Box
          component="img"
          alt="TUM logo"
          src={TumLogo}
          sx={{ width: 24, height: 24, display: "block" }}
        />
      </Link>
      <PillDivider />
      {/* Chevron-only back (label hidden); the link's aria-label keeps the
          accessible name "All diagrams". */}
      <BackNav to="/" label={ALL_DIAGRAMS_LABEL} labelClassName="hidden" />
    </Box>
  )
}

/**
 * Top-right: a true overflow bar (not a single hamburger). The two highest-value
 * actions stay reachable as direct icons — Share (collaboration is the reason to
 * be here on a phone) and Version history — and only the trailing, lower-
 * frequency actions (File, Save copy, Help, theme, title) collapse behind a "…"
 * (MoreVert) menu. This follows Apple HIG (Toolbars: keep primary actions
 * reachable, collapse the trailing items into a menu) and Material 3's top-app-
 * bar overflow guidance, within the phone height budget.
 */
export function MobileActionsPill() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { editor } = useEditorContext()
  const { openModal } = useModalContext()
  const [diagramTitle, setDiagramTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const unsubscribe = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!editor) return
    unsubscribe.current = editor.subscribeToDiagramNameChange((title: string) =>
      setDiagramTitle(title)
    )
    setDiagramTitle(editor.getDiagramMetadata().diagramTitle || "")
    return () => {
      if (unsubscribe.current !== undefined)
        editor.unsubscribe(unsubscribe.current)
    }
  }, [editor])

  const close = () => setAnchorEl(null)

  return (
    <Box
      aria-label="Editor actions"
      className="apollon-glass apollon-chrome-island"
      sx={PILL_SX}
    >
      {/* Primary actions stay visible as icons. */}
      <IconButton
        size="small"
        aria-label="Share"
        title="Share"
        onClick={() => openModal("SHARE")}
        sx={{ width: 32, height: 32, color: "var(--apollon-chrome-text)" }}
      >
        <ShareIcon fontSize="small" />
      </IconButton>
      <VersionHistoryButton labelClassName="hidden" />
      {/* Trailing, lower-frequency actions collapse behind the overflow menu. */}
      <IconButton
        id="mobile-options-button"
        size="small"
        aria-label="open options"
        title="More"
        aria-controls="mobile-options-menu"
        aria-haspopup="true"
        onClick={(e: React.MouseEvent<HTMLElement>) =>
          setAnchorEl(e.currentTarget)
        }
        sx={{ width: 32, height: 32, color: "var(--apollon-chrome-text)" }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        id="mobile-options-menu"
        anchorEl={anchorEl}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        keepMounted
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        open={Boolean(anchorEl)}
        onClose={close}
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
            "& > .MuiButton-root > svg:last-of-type": { ml: "auto !important" },
          }}
        >
          <BackNav
            to="/"
            label={ALL_DIAGRAMS_LABEL}
            tone="onSurface"
            onNavigate={close}
          />
          <NavbarFile
            color="var(--apollon-primary-contrast)"
            handleCloseNavMenu={close}
          />
          {/* Share + Version history live on the pill as visible icons now. */}
          <SaveLocalCopyButton
            color="var(--apollon-primary-contrast)"
            onAfter={close}
          />
          <NavbarHelp color="var(--apollon-primary-contrast)" />
          <ThemeSwitcherMenu asMenuItem onToggle={close} />
          <Box sx={{ px: 1.5, py: 1 }}>
            <TextField
              value={diagramTitle}
              onChange={(event) => {
                editor?.updateDiagramTitle(event.target.value)
                setDiagramTitle(event.target.value)
              }}
              placeholder="Diagram Name"
              fullWidth
              size="small"
              inputProps={{ "aria-label": "Diagram title" }}
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
  )
}
