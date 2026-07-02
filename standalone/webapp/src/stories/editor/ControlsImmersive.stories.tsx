import { useState, type CSSProperties, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { within, userEvent } from "storybook/test"
import {
  Apollon,
  ApollonControl,
  ApollonMode,
  type ApollonLabels,
} from "@tumaet/apollon"
import { editorStoryMeta, fixtureByType } from "../_support/editor"

/**
 * **Immersive host chrome via the controls API.** Each story registers host chrome
 * (header, footer action bar, side rails, corner buttons) into the editor as
 * `<ApollonControl>`s in named regions, so the engine lays it out collision-free
 * with the built-in palette/zoom/minimap: header/footer bands reserve an edge and
 * displace the canvas; corners float.
 */

const meta = {
  title: "Editor/Controls Immersive",
  ...editorStoryMeta,
  parameters: {
    ...editorStoryMeta.parameters,
    layout: "fullscreen",
  },
} satisfies Meta

export default meta
type Story = StoryObj

const FULLSCREEN: CSSProperties = { height: "100vh", width: "100%" }

// Shared so the light (TutorAssessment) and dark (DarkMode) grading rails stay
// identical instead of drifting.
const GRADING_INSTRUCTIONS = [
  "+2 P — all core classes present",
  "+3 P — correct multiplicities",
  "+2 P — inheritance modelled",
  "−1 P — each missing association role",
]

// ── Reusable mock host chrome ────────────────────────────────────────────────
// Deliberately host-owned UI (no React Flow context needed): `<ApollonControl>`
// portals these from the story's React tree, so they keep their own state/handlers.

// A floating glass island — the editor's OWN chrome recipe, straight off the
// `--apollon-chrome-*` design tokens (glass surface, saturated blur, hairline
// border, 12px radius, layered floating shadow). Matches the standalone's palette /
// zoom / header islands exactly and re-themes for free in light and dark.
const glass: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--apollon-chrome-gap, 8px)",
  padding: "var(--apollon-chrome-pad, 6px)",
  background: "var(--apollon-chrome-glass)",
  backdropFilter: "var(--apollon-chrome-glass-blur)",
  WebkitBackdropFilter: "var(--apollon-chrome-glass-blur)",
  border: "1px solid var(--apollon-chrome-border)",
  borderRadius: "var(--apollon-chrome-radius-lg, 12px)",
  boxShadow:
    "var(--apollon-chrome-shadow-floating), var(--apollon-chrome-inset-hairline)",
  color: "var(--apollon-chrome-text)",
  font: "600 13px/1.2 system-ui, sans-serif",
  pointerEvents: "auto",
}

// A rounded accent badge (status / score / timer) — a filled pill island.
function pill(bg: string, fg = "#fff"): CSSProperties {
  return {
    ...glass,
    background: bg,
    color: fg,
    border: "none",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 700,
  }
}

// A transparent full-width band row that FLOATS its islands (like the standalone's
// `.apollon-chrome-header-row`) — the band paints nothing; the pills do.
const bandRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--apollon-chrome-gap, 8px)",
  width: "100%",
  padding: "var(--apollon-chrome-edge, 10px)",
  pointerEvents: "none",
}

/** A header as floating islands: [back] [title] … [actions] — not a solid bar. */
function HeaderBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={bandRow}>
      <button
        type="button"
        style={{ ...glass, padding: "6px 12px", cursor: "pointer" }}
      >
        ← All diagrams
      </button>
      <div
        style={{ ...glass, padding: "6px 14px", fontSize: 14, fontWeight: 700 }}
      >
        {title}
      </div>
      <span style={{ flex: 1 }} />
      {right}
    </div>
  )
}

/** The "All saved / Saving…" indicator, as a glass island with a status dot. */
function SavedStatus() {
  const [state, setState] = useState<"saved" | "saving" | "unsaved">("saved")
  const label =
    state === "saved"
      ? "All changes saved"
      : state === "saving"
        ? "Saving…"
        : "Unsaved changes"
  const color =
    state === "saved" ? "#16a34a" : state === "saving" ? "#2563eb" : "#d97706"
  return (
    <button
      type="button"
      onClick={() =>
        setState((s) =>
          s === "saved" ? "unsaved" : s === "unsaved" ? "saving" : "saved"
        )
      }
      style={{ ...glass, padding: "6px 12px", cursor: "pointer" }}
      title="Click to cycle status (demo)"
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)`,
        }}
      />
      {label}
    </button>
  )
}

/** Score / points chip (assessment). */
function ScoreChip({ score, max }: { score: number; max: number }) {
  return (
    <span style={pill("linear-gradient(135deg,#059669,#10b981)")}>
      {score} / {max} P
    </span>
  )
}

/** A collapsible right-rail panel (problem statement, grading instructions), as a
 *  floating glass island that fills the rail height with an edge margin. */
function RailPanel({
  heading,
  children,
}: {
  heading: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div
      style={{
        ...glass,
        flexDirection: "column",
        alignItems: "stretch",
        flex: "1 1 auto",
        margin: "var(--apollon-chrome-gap, 8px)",
        gap: 10,
        width: open ? 300 : 52,
        overflow: "hidden",
        padding: open ? 14 : 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            ...glass,
            padding: "4px 9px",
            borderRadius: "var(--apollon-chrome-radius-md, 8px)",
            cursor: "pointer",
          }}
          aria-label={open ? "Collapse panel" : "Expand panel"}
        >
          {open ? "›" : "‹"}
        </button>
        {open && <strong style={{ fontSize: 14 }}>{heading}</strong>}
      </div>
      {open && (
        <div style={{ fontSize: 13, lineHeight: 1.5, overflow: "auto" }}>
          {children}
        </div>
      )}
    </div>
  )
}

/** A footer as a floating right-aligned actions island (not a solid bar). */
function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...bandRow, justifyContent: "flex-end" }}>
      <div style={{ ...glass, gap: 6 }}>{children}</div>
    </div>
  )
}

function Btn({
  children,
  variant = "ghost",
}: {
  children: ReactNode
  variant?: "primary" | "danger" | "ghost"
}) {
  const base: CSSProperties = {
    borderRadius: "var(--apollon-chrome-radius-md, 8px)",
    padding: "7px 13px",
    font: "600 13px/1 system-ui, sans-serif",
    cursor: "pointer",
    whiteSpace: "nowrap",
  }
  const variantStyle: CSSProperties =
    variant === "primary"
      ? {
          background: "var(--apollon-chrome-accent)",
          color: "var(--apollon-chrome-accent-contrast)",
          border: "none",
        }
      : variant === "danger"
        ? { background: "#dc2626", color: "#fff", border: "none" }
        : {
            background: "var(--apollon-chrome-surface)",
            color: "var(--apollon-chrome-text)",
            border: "1px solid var(--apollon-chrome-border-strong)",
          }
  return (
    <button type="button" style={{ ...base, ...variantStyle }}>
      {children}
    </button>
  )
}

/** A live countdown-ish exam timer badge. */
function ExamTimer() {
  return (
    <span style={pill("linear-gradient(135deg,#b45309,#d97706)")}>
      ⏱ 42:17 left
    </span>
  )
}

/** A secondary notice (Athena suggestions, problem-statement diff) as a centered
 *  floating pill — a toast island, not a full-width strip. */
function Banner({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <div style={{ ...bandRow, justifyContent: "center", paddingTop: 0 }}>
      <div
        style={{
          ...glass,
          background: tone,
          color: "#fff",
          border: "none",
          borderRadius: 999,
          padding: "6px 14px",
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Stories ──────────────────────────────────────────────────────────────────

/**
 * **Student modeling** — the palette + zoom + minimap coexist with a host header
 * (title, saved-status, help) and a collapsible right-rail problem statement. The
 * left palette, the right rail and the bottom zoom cluster never overlap; the
 * diagram fits inside what's left.
 */
export const StudentModeling: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:header" region="header">
        <HeaderBar
          title="Library System — Class Diagram"
          right={
            <>
              <SavedStatus />
              <button type="button" style={{ ...glass, padding: "6px 10px" }}>
                ? Help
              </button>
            </>
          }
        />
      </ApollonControl>

      <ApollonControl id="host:problem" region="right-rail">
        <RailPanel heading="Problem statement">
          Model the domain of a university <b>library</b>: a <code>Book</code>{" "}
          has many <code>Copy</code>s; a <code>Member</code> can{" "}
          <code>borrow</code> copies. Add multiplicities to every association
          and mark abstract classes in <i>italics</i>.
        </RailPanel>
      </ApollonControl>

      {/* Built-in chrome composed alongside the host chrome. */}
      <Apollon.Palette />
      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
}

/**
 * **Tutor assessment** — the built-in `<Apollon.Palette/>` is composed but
 * self-hides in `Assessment` mode (nothing to drag), so the tutor gets a clean
 * grading surface for free. A header carries the title + live score chip, a right
 * rail shows grading instructions, and a full-width **footer** band holds
 * Save / Override / Cancel / Assess-next — reserving bottom space so the diagram
 * and the zoom cluster sit clear above it.
 */
export const TutorAssessment: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Assessment}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:header" region="header">
        <HeaderBar
          title="Assessment · submission #482"
          right={<ScoreChip score={7} max={10} />}
        />
      </ApollonControl>

      <ApollonControl id="host:instructions" region="right-rail">
        <RailPanel heading="Grading instructions">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {GRADING_INSTRUCTIONS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </RailPanel>
      </ApollonControl>

      <ApollonControl id="host:actions" region="footer">
        <ActionBar>
          <Btn>Cancel</Btn>
          <Btn>Override</Btn>
          <Btn variant="primary">Save &amp; submit</Btn>
          <Btn variant="primary">Assess next →</Btn>
        </ActionBar>
      </ApollonControl>

      {/* Composed but self-hidden in Assessment mode — proves the built-in gates
          itself instead of the host conditionally omitting it. */}
      <Apollon.Palette />
      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
}

/**
 * **Exam chrome** — a normal modelling canvas (the candidate draws, so the palette
 * shows) wrapped in exam host chrome: a global exam bar (timer + hand-in-early) as
 * the header, the problem statement as a right rail, and a footer submit bar.
 * "Exam" is the host framing, not an editor mode — everything frames the canvas
 * without a single overlap.
 */
export const ExamMode: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Modelling}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:exambar" region="header">
        <HeaderBar
          title="Final Exam · Task 3 — Modeling"
          right={
            <>
              <ExamTimer />
              <Btn variant="danger">Hand in early</Btn>
            </>
          }
        />
      </ApollonControl>

      <ApollonControl id="host:problem" region="right-rail">
        <RailPanel heading="Your task">
          Model the <b>checkout</b> domain as a class diagram. You have{" "}
          <b>42 minutes</b> of working time remaining. Your work saves
          automatically.
        </RailPanel>
      </ApollonControl>

      <ApollonControl id="host:submit" region="footer">
        <ActionBar>
          <SavedStatus />
          <span style={{ flex: 1 }} />
          <Btn variant="primary">Submit task</Btn>
        </ActionBar>
      </ApollonControl>

      <Apollon.Palette />
      <Apollon.Zoom region="bottom-center" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
}

/**
 * **Stacked chrome in one band** — a host that owns an edge stacks several bars
 * on it by composing them vertically inside a single `<ApollonControl>`: here a
 * primary header row + an Athena feedback-suggestions banner + a
 * problem-statement-changed notice. The band's auto-inset measures the whole
 * stack, so the diagram makes room for all three rows — no per-bar registration
 * needed, and the reserved space is exactly the composed height.
 */
export const StackedChrome: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Assessment}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:header-stack" region="header">
        <div
          style={{ width: "100%", display: "flex", flexDirection: "column" }}
        >
          <HeaderBar
            title="Assessment · submission #482"
            right={<ScoreChip score={7} max={10} />}
          />
          <Banner tone="linear-gradient(90deg,#7c3aed,#6366f1)">
            ✨ Athena suggested 3 feedback items — review before submitting.
          </Banner>
          <Banner tone="linear-gradient(90deg,#0891b2,#0e7490)">
            ⓘ The problem statement was updated 2 minutes ago.
          </Banner>
        </div>
      </ApollonControl>

      <ApollonControl id="host:actions" region="footer">
        <ActionBar>
          <Btn>Cancel</Btn>
          <Btn variant="primary">Save &amp; submit</Btn>
        </ActionBar>
      </ApollonControl>

      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
}

/**
 * **Dark mode** — the same immersive assessment layout under `dataTheme="dark"`.
 * Host chrome that reads the `--apollon-*` tokens (surface, border, foreground)
 * re-themes with the editor, so header/footer/rail chrome stays cohesive in both
 * themes instead of a light bar stranded on a dark canvas.
 */
export const DarkMode: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Assessment}
      dataTheme="dark"
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:header" region="header">
        <HeaderBar
          title="Assessment · submission #482"
          right={<ScoreChip score={7} max={10} />}
        />
      </ApollonControl>
      <ApollonControl id="host:instructions" region="right-rail">
        <RailPanel heading="Grading instructions">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {GRADING_INSTRUCTIONS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </RailPanel>
      </ApollonControl>
      <ApollonControl id="host:actions" region="footer">
        <ActionBar>
          <Btn>Cancel</Btn>
          <Btn variant="primary">Save &amp; submit</Btn>
          <Btn variant="primary">Assess next →</Btn>
        </ActionBar>
      </ApollonControl>
      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
}

/**
 * **Independently-owned stacked bars (lanes)** — unlike `StackedChrome` (which
 * composes one control), here TWO separately-registered `<ApollonControl>`s share
 * the header: an exam bar in lane 0 and a "problem statement changed" banner in
 * lane 1. Different lanes STACK across the band and their reserved insets SUM, so
 * both get room and the diagram clears both — the cross-owner case (e.g. library
 * presence + host header) that a single composed control can't express.
 */
export const IndependentLanes: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Modelling}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:exambar" region="header" lane={0}>
        <HeaderBar title="Final exam · Task 3" right={<ExamTimer />} />
      </ApollonControl>
      <ApollonControl id="host:banner" region="header" lane={1}>
        <Banner tone="linear-gradient(90deg,#0891b2,#0e7490)">
          ⓘ The problem statement was updated — re-read Task 3 before
          continuing.
        </Banner>
      </ApollonControl>

      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
}

/**
 * **Selection-anchored toolbar** — the Figma/tldraw pattern via
 * `<Apollon.SelectionToolbar>`: select a node and a constant-size toolbar appears
 * just above it, follows it as it moves, and does NOT scale with zoom. Screen-space
 * (contrast `on-canvas`, which lives in diagram space). The `play` selects a node
 * so the toolbar is visible without manual interaction.
 */
export const SelectionToolbar: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Modelling}
      enablePopups
      style={FULLSCREEN}
    >
      <Apollon.SelectionToolbar position="top">
        <div style={{ ...glass, gap: 4, padding: 4 }}>
          <Btn>Duplicate</Btn>
          <Btn>Bring to front</Btn>
          <Btn variant="danger">Delete</Btn>
        </div>
      </Apollon.SelectionToolbar>

      <Apollon.Palette />
      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
  play: async ({ canvasElement }) => {
    const node = canvasElement.querySelector<HTMLElement>(".react-flow__node")
    if (node) await userEvent.click(node)
    // The toolbar only renders while something is selected.
    await within(canvasElement).findByText("Bring to front")
  },
}

// A host's German strings for the editor's own chrome. Partial — every key it
// omits falls back to the shipped English.
const GERMAN: Partial<ApollonLabels> = {
  zoomIn: "Vergrößern",
  zoomOut: "Verkleinern",
  fitView: "Ansicht einpassen",
  resetZoom: "Zoom auf 100 % zurücksetzen",
  zoomReadout: (percent) => `Zoom bei ${percent} %, auf 100 % zurücksetzen`,
  undo: "Rückgängig",
  redo: "Wiederherstellen",
  showMinimap: "Übersicht anzeigen",
  showMinimapHint: "Übersichtskarte anzeigen",
  hideMinimap: "Übersicht ausblenden",
  elementPalette: "Elementpalette",
}

/**
 * **Internationalized (i18n)** — the same editor with a host's German strings
 * passed via `labels`. The `play` asserts the built-in zoom control's accessible
 * name is now German ("Vergrößern"/"Verkleinern") — proving `labels` reaches the
 * editor's OWN chrome, not just the host's hardcoded header. `labels` is reactive:
 * a host can switch language without remounting.
 */
export const Internationalized: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      defaultMode={ApollonMode.Modelling}
      labels={GERMAN}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:header" region="header">
        <HeaderBar
          title="Klassendiagramm · Aufgabe 3"
          right={<Btn variant="primary">Speichern</Btn>}
        />
      </ApollonControl>
      <Apollon.Palette />
      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await canvas.findByRole("button", { name: "Vergrößern" })
    await canvas.findByRole("button", { name: "Verkleinern" })
  },
}
