import { Link } from "@tanstack/react-router"
import { Button } from "@tumaet/ui/components/button"
import { ShareIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumaet/ui/components/tooltip"
import { useModalContext } from "@/contexts"
import { useMediaQuery } from "@/hooks"
import { ALL_DIAGRAMS_LABEL } from "@/lib/navProvenance"
import { BrandLockup } from "./BrandLockup"
import { BackNav } from "./BackNav"
import { FileMenu } from "./FileMenu"
import { HelpMenu } from "./HelpMenu"
import { SaveLocalCopyButton } from "./SaveLocalCopyButton"
import { VersionHistoryButton } from "./VersionHistoryButton"
import { ThemeSwitcherMenu } from "./ThemeSwitcher"
import { MobileBackPill, MobileActionsPill } from "./MobileIslands"
import { navbarButtonStyle } from "./styleConstants"
import { Island, GroupDivider } from "./islandPrimitives"
import { HeaderTitleField } from "./HeaderTitleField"
import { useDiagramTitle } from "./useDiagramTitle"

/**
 * The whole editor header as one fluid flex row inside the `header` overlay band:
 * `[brand/back] [title — flex middle] [actions]`. Because the three groups are
 * flex siblings (not independent absolutely-positioned Panels), the title gets a
 * real, bounded middle column — it grows then shrinks with ellipsis and can never
 * overlap the brand/actions — and the gaps stay constant at every width.
 *
 * One `TooltipProvider` (delay 0) wraps the whole header so every icon-only
 * control — desktop island and mobile pill alike — reveals its tooltip
 * instantly and with one shared timing.
 */
interface EditorHeaderRowProps {
  /**
   * Layout mode: `"full"` is the desktop island bar; `"narrow"` (portrait phone)
   * collapses to compact pills with an overflow menu.
   */
  layout: "full" | "narrow"
  /**
   * Hide the brand wordmark in the full layout (native app). Independent of
   * `layout` — a native, non-narrow viewport is `"full"` yet still hides the
   * brand — so it stays a separate boolean rather than folding into `layout`.
   */
  hideBrand: boolean
}

export function EditorHeaderRow({ layout, hideBrand }: EditorHeaderRowProps) {
  const isNarrow = layout === "narrow"
  return (
    <TooltipProvider>
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
    </TooltipProvider>
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
            <BrandLockup />
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
 * Top-center container: pairs the {@link useDiagramTitle} editor-store wiring
 * with the pure {@link HeaderTitleField} view.
 */
export function HeaderTitleIsland() {
  const { value, onValueChange } = useDiagramTitle()
  return <HeaderTitleField value={value} onValueChange={onValueChange} />
}

/**
 * Top-right: document/view actions (File · Share · Save · Version history) then,
 * after a SINGLE group divider, the {Help, Theme} identity/view cluster — the
 * IDENTICAL grouping used by `ChromeSubHeader` and the home band's actions
 * island, so all three headers read as one pattern.
 */
export function HeaderActionsIsland() {
  const { openModal } = useModalContext()
  // Label visible at `lg` ⇒ disable the icon-only tooltip, matching the rest of
  // the action family (File, Save, Version).
  const isLg = useMediaQuery("(min-width: 1024px)")
  return (
    <Island ariaLabel="Editor actions">
      <div className="flex items-center gap-0.5">
        <FileMenu />
        {/* Action control → ONE leading glyph + a label that collapses below `lg`,
            with the shared tooltip naming it when icon-only. No caret (it isn't a
            menu) — matching Save/Version. */}
        <Tooltip disabled={isLg}>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                className={navbarButtonStyle()}
                aria-label="Share"
                onClick={() => openModal("SHARE", { dialogVariant: "home" })}
              >
                <ShareIcon className="size-4" aria-hidden />
                <span className="hidden lg:inline">Share</span>
              </Button>
            }
          />
          <TooltipContent>Share</TooltipContent>
        </Tooltip>
        <SaveLocalCopyButton />
        <VersionHistoryButton />
      </div>
      <GroupDivider />
      <div className="flex items-center gap-0.5">
        <HelpMenu />
        <ThemeSwitcherMenu />
      </div>
    </Island>
  )
}
