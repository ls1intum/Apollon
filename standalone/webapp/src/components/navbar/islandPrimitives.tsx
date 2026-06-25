import {
  forwardRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from "react"

/**
 * Shared island primitives — the floating-glass "island band" grammar lifted out
 * of HeaderIslands.tsx / MobileIslands.tsx so BOTH the editor chrome header and
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
}: {
  children: ReactNode
  as?: "header"
  role?: string
  ariaLabel?: string
  className?: string
}) {
  const Tag = as ?? "div"
  return (
    <Tag
      role={role}
      aria-label={ariaLabel}
      className={`apollon-glass apollon-chrome-island${className ? ` ${className}` : ""}`}
      style={ISLAND_LAYOUT_STYLE}
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
export const IslandInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function IslandInput({ className, style, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      // The placeholder colour is set on `.apollon-chrome-title-input` in
      // components.css (input::placeholder can't be expressed inline).
      className={`apollon-chrome-title-input${className ? ` ${className}` : ""}`}
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
})
