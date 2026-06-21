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
import { navbarButtonStyle } from "./styleConstants"

/**
 * The editor header is no longer a full-width bar — it is a set of floating
 * glass islands (top-left / top-center / top-right) that hover over a full-bleed
 * canvas, the same family of objects as the palette and zoom/minimap controls
 * (Excalidraw/tldraw corner-cluster model). Each island is portaled into its own
 * overlay region (EditorChromeHeader), so the diagram makes room for it via the
 * region's measured inset and the palette drops below the top islands.
 *
 * `.apollon-glass` gives every island the shared Liquid-Glass surface (tint
 * floor + backdrop blur + concentric radii); the wrapper just lays out content
 * and re-enables pointer events over the pointer-transparent region.
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
 * Top-left: identity + navigation. Rendered as <header role="banner"> so the
 * editor keeps exactly one banner landmark (the "All diagrams" link is scoped to
 * it in the e2e suite).
 */
export function HeaderBrandIsland() {
  return (
    <Island as="header" role="banner" ariaLabel="Editor">
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
      <BackNav
        to="/"
        label={ALL_DIAGRAMS_LABEL}
        labelClassName="hidden xl:inline"
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
          style: { textAlign: "center" },
        }}
        sx={{
          px: 1,
          minWidth: 120,
          maxWidth: 340,
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
        <Button sx={navbarButtonStyle()} onClick={() => openModal("SHARE")}>
          <Typography color="inherit" component="span">
            Share
          </Typography>
        </Button>
        <SaveLocalCopyButton labelClassName="hidden xl:inline" />
        <NavbarHelp />
      </Stack>
      <GroupDivider />
      <Stack direction="row" alignItems="center" gap={0.25}>
        <VersionHistoryButton labelClassName="hidden xl:inline" />
        <ThemeSwitcherMenu />
      </Stack>
    </Island>
  )
}
