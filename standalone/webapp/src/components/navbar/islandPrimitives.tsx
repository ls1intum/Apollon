import {
  type AriaRole,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react"
import { cn } from "@tumaet/ui/lib/utils"

/**
 * Shared island primitives — the floating-glass "island band" grammar lifted out
 * of EditorHeader.tsx / MobileIslands.tsx so BOTH the editor chrome header and
 * the (forthcoming) webapp HOME band build their bands from one source.
 *
 * Everything here is presentational and editor-agnostic: it paints the
 * `.apollon-glass` surface and lays content out on the shared chrome-token grid
 * (`--apollon-chrome-*`), with NO editor/context/router dependency — so the home
 * band can import it with no editor mounted. The chrome tokens + the
 * `.apollon-glass` / `.apollon-chrome-iconbtn` classes are single-sourced in
 * @tumaet/ui (tokens.css + components.css), available webapp-wide.
 */

/**
 * The shared flex layout EVERY island/pill uses: one shared height so sibling
 * islands align their bottoms exactly, the chrome gap between children, the
 * chrome inner padding, and the pointer-events re-enable over the transparent
 * overlay band. Exported so the compact mobile pills reuse the identical box
 * (their only delta is the height budget, which comes from the same token).
 */
export const ISLAND_LAYOUT_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--apollon-chrome-gap)",
  // One shared height so brand/title/actions align their bottoms exactly;
  // content centers within it (concentric radius: 12 outer − 6 pad = 6).
  height: "var(--apollon-chrome-island-h)",
  paddingLeft: "var(--apollon-chrome-pad)",
  paddingRight: "var(--apollon-chrome-pad)",
  paddingTop: 0,
  paddingBottom: 0,
  boxSizing: "border-box",
  pointerEvents: "auto",
  maxWidth: "100%",
  minWidth: 0,
}

/**
 * The `DropdownMenuContent` contract every chrome menu shares: a fixed `w-60`
 * capped to the viewport (minus safe-area + 16px) so a phone never overflows it,
 * and a 44px `min-h-11` touch target on every actionable row (item + sub-trigger),
 * gated to `max-md` so menus that also mount on desktop (the diagram-card "…"
 * menu) keep the compact desktop rows that match the navbar menus. Single-sourced
 * so the editor File / Help menus, the home overflow, and the diagram-card menu
 * size their rows identically.
 *
 * A sub-content renders in its OWN portal, so a parent-content class can't reach
 * it — apply {@link MOBILE_MENU_SUBCONTENT_CLASS} to the `DropdownMenuSubContent`.
 */
export const MOBILE_MENU_CONTENT_CLASS =
  "flex w-60 max-w-[calc(100vw-var(--safe-area-inset-left,0px)-var(--safe-area-inset-right,0px)-16px)] flex-col [&_[data-slot=dropdown-menu-item]]:max-md:min-h-11 [&_[data-slot=dropdown-menu-sub-trigger]]:max-md:min-h-11"

/** Row touch-target floor for a `DropdownMenuSubContent` (its own portal). */
export const MOBILE_MENU_SUBCONTENT_CLASS =
  "[&_[data-slot=dropdown-menu-radio-item]]:max-md:min-h-11 [&_[data-slot=dropdown-menu-item]]:max-md:min-h-11"

/**
 * One floating glass island. Portaled (by the consumer) into an overlay region;
 * `.apollon-glass` gives the shared surface, this wrapper lays out content and
 * re-enables pointer events over the transparent region.
 */
export function Island({
  children,
  as,
  role,
  ariaLabel,
  className,
  style,
}: {
  children: ReactNode
  as?: "header"
  role?: AriaRole
  ariaLabel?: string
  className?: string
  /**
   * Per-instance overrides merged over the shared layout (e.g. a `maxWidth` cap
   * on the centre title/search island). Merged AFTER `ISLAND_LAYOUT_STYLE` so it
   * wins — needed because the base layout sets `maxWidth: "100%"` inline, which
   * a Tailwind `max-w-*` class can't override.
   */
  style?: CSSProperties
}) {
  const Tag = as ?? "div"
  return (
    <Tag
      role={role}
      aria-label={ariaLabel}
      className={cn("apollon-glass apollon-chrome-island", className)}
      style={style ? { ...ISLAND_LAYOUT_STYLE, ...style } : ISLAND_LAYOUT_STYLE}
    >
      {children}
    </Tag>
  )
}

/** Thin vertical hairline that separates functional groups inside an island. */
export function GroupDivider() {
  return (
    <div
      aria-hidden
      style={{
        alignSelf: "stretch",
        width: "1px",
        marginTop: "3px",
        marginBottom: "3px",
        marginLeft: "2px",
        marginRight: "2px",
        backgroundColor: "var(--apollon-chrome-border)",
      }}
    />
  )
}

/**
 * A borderless text field rendered directly ON the glass surface — the island
 * itself is the input's chrome (no border/background of its own; the parent
 * `.apollon-chrome-title-island` lifts an accent ring on `:focus-within`, and
 * `.apollon-chrome-title-input::placeholder` colours the placeholder — both in
 * components.css). Used by the editor's diagram-title capsule and reusable by the
 * home band's search field. All native input props (value, onChange, size,
 * placeholder, aria-label …) pass through; callers may extend the base style.
 */
export const IslandInput = ({
  className,
  style,
  ...props
}: ComponentProps<"input">) => {
  return (
    <input
      type="text"
      // The placeholder colour is set on `.apollon-chrome-title-input` in
      // components.css (input::placeholder can't be expressed inline).
      className={cn("apollon-chrome-title-input", className)}
      style={{
        textAlign: "left",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        border: 0,
        outline: "none",
        background: "transparent",
        paddingLeft: 8,
        paddingRight: 8,
        minWidth: 0,
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "var(--apollon-chrome-text)",
        ...style,
      }}
      {...props}
    />
  )
}
