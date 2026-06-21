import React, { useState } from "react"
import Box from "@mui/material/Box"
import Menu from "@mui/material/Menu"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import ShareIcon from "@mui/icons-material/IosShare"
import { useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BackNav } from "./BackNav"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { VersionHistoryButton } from "./VersionHistoryButton"

/**
 * Compact mobile chrome pills (same material + height as the desktop islands),
 * sized to the phone-portrait / phone-landscape height budget.
 */
const PILL_SX = {
  display: "flex",
  alignItems: "center",
  gap: "var(--apollon-chrome-gap)",
  height: "var(--apollon-chrome-island-h)",
  px: "var(--apollon-chrome-pad)",
  py: 0,
  boxSizing: "border-box",
  pointerEvents: "auto",
  maxWidth: "100%",
  minWidth: 0,
} as const

/**
 * Left cluster on narrow phones: an ALWAYS-visible back affordance, NO brand
 * mark (on a phone the logo/wordmark is noise that crowds out controls). Still
 * the single <header role="banner"> so the "All diagrams" link stays scoped to
 * the banner landmark for the e2e suite.
 */
export function MobileBackPill() {
  return (
    <Box
      component="header"
      role="banner"
      aria-label="Editor"
      className="apollon-glass apollon-chrome-island"
      sx={PILL_SX}
    >
      {/* Chevron-only back (label hidden); the link's aria-label keeps the
          accessible name "All diagrams". */}
      <BackNav to="/" label={ALL_DIAGRAMS_LABEL} labelClassName="hidden" />
    </Box>
  )
}

/**
 * Right cluster on narrow phones: a true overflow bar (not a single hamburger).
 * The two highest-value actions stay reachable as direct icons — Share
 * (collaboration is the reason to be here on a phone) and Version history — and
 * only the trailing, lower-frequency actions (File, Save copy, Help, theme)
 * collapse behind a "…" (MoreVert) menu. The diagram title is NOT here — it
 * lives in the header's centre track (see EditorHeaderRow).
 */
export function MobileActionsPill() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { openModal } = useModalContext()
  const close = () => setAnchorEl(null)

  return (
    <Box
      aria-label="Editor actions"
      className="apollon-glass apollon-chrome-island"
      sx={PILL_SX}
    >
      {/* Primary actions stay visible as icons — same .apollon-chrome-iconbtn
          family (size/hover/radius/focus) as the zoom/minimap controls. */}
      <button
        type="button"
        className="apollon-chrome-iconbtn"
        aria-label="Share"
        title="Share"
        onClick={() => openModal("SHARE", { dialogVariant: "home" })}
      >
        <ShareIcon fontSize="small" />
      </button>
      <VersionHistoryButton labelClassName="hidden" />
      {/* Trailing, lower-frequency actions collapse behind the overflow menu. */}
      <button
        type="button"
        id="mobile-options-button"
        className="apollon-chrome-iconbtn"
        aria-label="open options"
        title="More"
        aria-controls="mobile-options-menu"
        aria-haspopup="true"
        onClick={(e: React.MouseEvent<HTMLElement>) =>
          setAnchorEl(e.currentTarget)
        }
      >
        <MoreVertIcon fontSize="small" />
      </button>
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
          {/* Back lives in the back pill; Share + Version on the bar; title in
              the header centre — so the menu is just the low-frequency tail. */}
          <NavbarFile
            color="var(--apollon-primary-contrast)"
            handleCloseNavMenu={close}
          />
          <SaveLocalCopyButton
            color="var(--apollon-primary-contrast)"
            onAfter={close}
          />
          <NavbarHelp color="var(--apollon-primary-contrast)" />
          <ThemeSwitcherMenu asMenuItem onToggle={close} />
        </Box>
      </Menu>
    </Box>
  )
}
