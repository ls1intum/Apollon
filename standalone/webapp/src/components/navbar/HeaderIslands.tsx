import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import InputBase from "@mui/material/InputBase"
import Typography from "@mui/material/Typography"
import Stack from "@mui/material/Stack"
import { Link } from "@tanstack/react-router"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useEditorContext, useModalContext } from "@/contexts"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BrandAndVersion } from "./BrandAndVersion"
import { BackNav } from "./BackNav"
import { NavbarFile } from "./NavbarFile"
import { NavbarHelp } from "./NavbarHelp"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { MobileBackPill, MobileActionsPill } from "./MobileIslands"
import { navbarButtonStyle } from "./styleConstants"

/**
 * The whole editor header as one fluid flex row inside the `header` overlay band:
 * `[brand/back] [title — flex middle] [actions]`. Because the three groups are
 * flex siblings (not independent absolutely-positioned Panels), the title gets a
 * real, bounded middle column — it grows then shrinks with ellipsis and can never
 * overlap the brand/actions — and the gaps stay constant at every width.
 */
export function EditorHeaderRow({
  isNarrow,
  hideBrand,
}: {
  isNarrow: boolean
  hideBrand: boolean
}) {
  return (
    <div className="apollon-chrome-header-row">
      {isNarrow ? (
        <MobileBackPill />
      ) : (
        <HeaderBrandIsland showLogo={!hideBrand} />
      )}
      <div className="apollon-chrome-header-spacer">
        <HeaderTitleIsland />
      </div>
      {isNarrow ? <MobileActionsPill /> : <HeaderActionsIsland />}
    </div>
  )
}

/**
 * One floating glass island. Portaled (by EditorChromeHeader) into a top-*
 * overlay region; `.apollon-glass` gives the shared surface, this wrapper lays
 * out content and re-enables pointer events over the transparent region.
 */
function Island({
  children,
  as,
  role,
  ariaLabel,
  className,
}: {
  children: ReactNode
  as?: "header"
  role?: string
  ariaLabel?: string
  className?: string
}) {
  return (
    <Box
      component={as ?? "div"}
      role={role}
      aria-label={ariaLabel}
      className={`apollon-glass apollon-chrome-island${className ? ` ${className}` : ""}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "var(--apollon-chrome-gap)",
        // One shared height so brand/title/actions align their bottoms exactly;
        // content centers within it (concentric radius: 12 outer − 6 pad = 6).
        height: "var(--apollon-chrome-island-h)",
        px: "var(--apollon-chrome-pad)",
        py: 0,
        boxSizing: "border-box",
        pointerEvents: "auto",
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      {children}
    </Box>
  )
}

/** Thin vertical hairline that separates functional groups inside an island. */
function GroupDivider() {
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
 * Left cluster: identity + navigation. Rendered as <header role="banner"> so the
 * editor keeps exactly one banner landmark (the "All diagrams" link is scoped to
 * it in the e2e suite). `showLogo` is all-or-nothing — the wordmark is part of the
 * logo, so we never collapse it to an icon; when hidden (native app) the cluster
 * is just the always-present back control.
 */
export function HeaderBrandIsland({ showLogo = true }: { showLogo?: boolean }) {
  return (
    <Island as="header" role="banner" ariaLabel="Editor">
      {showLogo && (
        <>
          <Link
            to="/"
            aria-label="Apollon home"
            style={{
              display: "flex",
              alignItems: "center",
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <BrandAndVersion />
          </Link>
          <GroupDivider />
        </>
      )}
      <BackNav
        to="/"
        label={ALL_DIAGRAMS_LABEL}
        labelClassName="hidden lg:inline"
      />
    </Island>
  )
}

/**
 * Top-center: the diagram title as a quiet document-identity capsule (a
 * borderless field on the glass surface; the island itself is the input chrome).
 */
export function HeaderTitleIsland() {
  const { editor } = useEditorContext()
  const [title, setTitle] = useState(
    editor?.getDiagramMetadata().diagramTitle || ""
  )
  const subId = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!editor) return
    subId.current = editor.subscribeToDiagramNameChange((t) => setTitle(t))
    // Initial read from the editor store on (re)mount / editor swap.
    setTitle(editor.getDiagramMetadata().diagramTitle || "")
    return () => {
      if (subId.current !== undefined) editor.unsubscribe(subId.current)
    }
  }, [editor])

  return (
    <Island className="apollon-chrome-title-island">
      <InputBase
        value={title}
        onChange={(e) => {
          editor?.updateDiagramTitle(e.target.value)
          setTitle(e.target.value)
        }}
        placeholder="Untitled diagram"
        inputProps={{
          // "title" not "name" so it doesn't collide with the template dialog's
          // "Name" field under getByLabel('Name') in the e2e suite.
          "aria-label": "Diagram title",
          // Grow the field with the name (in ch), clamped so short titles stay
          // compact and long ones grow — maxWidth then bounds it in px. NOT
          // capped by a vw fraction: the field uses the real slack left in the
          // header track and only shrinks (ellipsis) when that track is tight.
          size: Math.min(
            Math.max((title || "Untitled diagram").length, 12),
            56
          ),
          style: {
            textAlign: "left",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        }}
        sx={{
          px: 1,
          minWidth: 0,
          // Left-aligned, grows with the name up to 560px (and never past the
          // track via 100%), then ellipsises — no artificial vw shrink.
          maxWidth: "min(560px, 100%)",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "var(--apollon-chrome-text)",
          "& input::placeholder": {
            color: "var(--apollon-chrome-text-muted)",
            opacity: 1,
          },
        }}
      />
    </Island>
  )
}

/**
 * Top-right: document actions (File · Share · Save · Help) then view/identity
 * (Version history · theme), split by a hairline group divider.
 */
export function HeaderActionsIsland() {
  const { openModal } = useModalContext()
  return (
    <Island ariaLabel="Editor actions">
      <Stack direction="row" alignItems="center" gap={0.25}>
        <NavbarFile />
        <Button
          sx={navbarButtonStyle()}
          onClick={() => openModal("SHARE", { dialogVariant: "home" })}
        >
          <Typography color="inherit" component="span">
            Share
          </Typography>
        </Button>
        <SaveLocalCopyButton labelClassName="hidden lg:inline" />
        <NavbarHelp />
      </Stack>
      <GroupDivider />
      <Stack direction="row" alignItems="center" gap={0.25}>
        <VersionHistoryButton labelClassName="hidden lg:inline" />
        <ThemeSwitcherMenu />
      </Stack>
    </Island>
  )
}
