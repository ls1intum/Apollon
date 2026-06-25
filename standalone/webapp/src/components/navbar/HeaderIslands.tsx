import { Link } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
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
import { Island, GroupDivider, IslandInput } from "./islandPrimitives"

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
      <IslandInput
        value={title}
        onChange={(e) => {
          editor?.updateDiagramTitle(e.target.value)
          setTitle(e.target.value)
        }}
        placeholder="Untitled diagram"
        // "title" not "name" so it doesn't collide with the template dialog's
        // "Name" field under getByLabel('Name') in the e2e suite.
        aria-label="Diagram title"
        // Grow the field with the name (in ch), clamped so short titles stay
        // compact and long ones grow — maxWidth then bounds it in px. NOT
        // capped by a vw fraction: the field uses the real slack left in the
        // header track and only shrinks (ellipsis) when that track is tight.
        size={Math.min(Math.max((title || "Untitled diagram").length, 12), 56)}
        // Left-aligned, grows with the name up to 560px (and never past the
        // track via 100%), then ellipsises — no artificial vw shrink.
        style={{ maxWidth: "min(560px, 100%)" }}
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
      <div className="flex items-center gap-0.5">
        <NavbarFile />
        <button
          type="button"
          className={navbarButtonStyle()}
          onClick={() => openModal("SHARE", { dialogVariant: "home" })}
        >
          <span>Share</span>
        </button>
        <SaveLocalCopyButton labelClassName="hidden lg:inline" />
        <NavbarHelp />
      </div>
      <GroupDivider />
      <div className="flex items-center gap-0.5">
        <VersionHistoryButton labelClassName="hidden lg:inline" />
        <ThemeSwitcherMenu />
      </div>
    </Island>
  )
}
