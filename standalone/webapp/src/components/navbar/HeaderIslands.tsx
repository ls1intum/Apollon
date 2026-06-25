import { Link } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Button } from "@tumaet/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
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
    // The title island FILLS the centre track (`w-full`) so the actions stay
    // pinned right with no dead gap floating between them — the same "centre
    // island fills its track, borderless input fills the island" rule the home
    // search island follows. The island is `flex-1` inside the spacer; the input
    // is `flex-1 min-w-0` so it consumes the island and ellipsises when tight.
    <Island className="apollon-chrome-title-island w-full">
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
        // Fills the island and ellipsises when the track is tight — the field
        // uses the real slack left in the header track (no `size`/maxWidth cap
        // that would leave the rest of the track as dead glass).
        className="flex-1"
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
    <TooltipProvider>
      <Island ariaLabel="Editor actions">
        <div className="flex items-center gap-0.5">
          <NavbarFile />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={navbarButtonStyle()}
                  onClick={() => openModal("SHARE", { dialogVariant: "home" })}
                >
                  Share
                </Button>
              }
            />
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
          <SaveLocalCopyButton labelClassName="hidden lg:inline" />
          <NavbarHelp />
        </div>
        <GroupDivider />
        <div className="flex items-center gap-0.5">
          <VersionHistoryButton labelClassName="hidden lg:inline" />
          <ThemeSwitcherMenu />
        </div>
      </Island>
    </TooltipProvider>
  )
}
