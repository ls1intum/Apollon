import { useState, type CSSProperties, type ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  Apollon,
  ApollonControl,
  ApollonMode,
  type OverlayRegion,
} from "@tumaet/apollon"
import { editorStoryMeta, fixtureByType } from "../_support/editor"

/**
 * **Immersive host chrome via the controls API.** These stories dogfood the
 * overlay/controls API the way a real host (the Apollon standalone, or Artemis)
 * would: instead of stacking a title bar, a submit bar, a problem-statement panel
 * and a score badge OUTSIDE the canvas — each fighting the palette/zoom/minimap
 * for space — every piece of host chrome is registered INTO the editor as an
 * `<ApollonControl>` in a named region. The engine then lays them all out
 * collision-free and makes the diagram "make room": header/footer **bands** reserve
 * an edge and displace the canvas; corners **float**.
 *
 * The point being proven: the palette, zoom cluster and minimap coexist with a
 * host header, footer action bar, side rails and corner buttons with zero manual
 * spacing hacks (contrast Artemis's `margin-top: 30px` nudge to keep its floating
 * fullscreen button off the palette).
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

// ── Reusable mock host chrome ────────────────────────────────────────────────
// Deliberately host-owned UI (no React Flow context needed): `<ApollonControl>`
// portals these from the story's React tree, so they keep their own state/handlers.

const glass: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 12,
  background: "var(--apollon-chrome-surface, rgba(255,255,255,0.82))",
  border: "1px solid var(--apollon-border, rgba(0,0,0,0.08))",
  boxShadow: "0 6px 20px rgba(0,0,0,0.10)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  font: "500 13px/1.2 system-ui, sans-serif",
  color: "var(--apollon-foreground, #1a1a1a)",
  pointerEvents: "auto",
}

function pill(bg: string, fg = "#fff"): CSSProperties {
  return {
    ...glass,
    background: bg,
    color: fg,
    border: "none",
    fontWeight: 600,
  }
}

/** A full-width header row: back + editable-ish title + actions. */
function HeaderBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div
      style={{
        ...glass,
        width: "100%",
        borderRadius: 0,
        border: "none",
        borderBottom: "1px solid var(--apollon-border, rgba(0,0,0,0.08))",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        background: "var(--apollon-chrome-surface, rgba(255,255,255,0.9))",
        padding: "8px 16px",
        gap: 12,
      }}
    >
      <button type="button" style={{ ...glass, padding: "4px 10px" }}>
        ← All diagrams
      </button>
      <strong style={{ fontSize: 15, fontWeight: 700 }}>{title}</strong>
      <span style={{ flex: 1 }} />
      {right}
    </div>
  )
}

/** The "All saved / Saving…" indicator Artemis draws above the canvas. */
function SavedStatus() {
  const [state, setState] = useState<"saved" | "saving" | "unsaved">("saved")
  const label =
    state === "saved"
      ? "✓ All changes saved"
      : state === "saving"
        ? "⟳ Saving…"
        : "● Unsaved changes"
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
      style={{ ...glass, color, fontWeight: 600 }}
      title="Click to cycle status (demo)"
    >
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

/** A collapsible right-rail panel (problem statement, grading instructions). */
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
        gap: 10,
        width: open ? 300 : 44,
        height: "100%",
        borderRadius: 0,
        borderLeft: "1px solid var(--apollon-border, rgba(0,0,0,0.08))",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.06)",
        overflow: "hidden",
        padding: open ? 16 : 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ ...glass, padding: "2px 8px" }}
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

/** A full-width bottom action bar (assessment / exam submit). */
function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...glass,
        width: "100%",
        justifyContent: "flex-end",
        gap: 10,
        borderRadius: 0,
        border: "none",
        borderTop: "1px solid var(--apollon-border, rgba(0,0,0,0.08))",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.04)",
        background: "var(--apollon-chrome-surface, rgba(255,255,255,0.92))",
        padding: "10px 16px",
      }}
    >
      {children}
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
  const bg =
    variant === "primary"
      ? "linear-gradient(135deg,#4f46e5,#6366f1)"
      : variant === "danger"
        ? "linear-gradient(135deg,#dc2626,#ef4444)"
        : "transparent"
  return (
    <button
      type="button"
      style={{
        ...(variant === "ghost" ? glass : pill(bg)),
        padding: "8px 16px",
        cursor: "pointer",
      }}
    >
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
      <ApollonControl id="host:header" region="header" inset="auto">
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

      <ApollonControl id="host:problem" region="right-rail" inset="auto">
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
 * **Tutor assessment** — no palette (assessment mode self-hides it). A header
 * carries the title + live score chip, a right rail shows grading instructions,
 * and a full-width **footer** action bar (the new `footer` band) holds
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
      <ApollonControl id="host:header" region="header" inset="auto">
        <HeaderBar
          title="Assessment · submission #482"
          right={<ScoreChip score={7} max={10} />}
        />
      </ApollonControl>

      <ApollonControl id="host:instructions" region="right-rail" inset="auto">
        <RailPanel heading="Grading instructions">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>+2 P — all core classes present</li>
            <li>+3 P — correct multiplicities</li>
            <li>+2 P — inheritance modelled</li>
            <li>−1 P — each missing association role</li>
          </ul>
        </RailPanel>
      </ApollonControl>

      <ApollonControl id="host:actions" region="footer" inset="auto">
        <ActionBar>
          <Btn>Cancel</Btn>
          <Btn>Override</Btn>
          <Btn variant="primary">Save &amp; submit</Btn>
          <Btn variant="primary">Assess next →</Btn>
        </ActionBar>
      </ApollonControl>

      <Apollon.Zoom region="bottom-left" history={false} />
      <Apollon.MiniMap region="top-right" />
    </Apollon>
  ),
}

/**
 * **Exam mode** — a global exam bar (timer + hand-in-early) as the header, the
 * problem statement as a right rail, and a footer submit bar. Everything the
 * candidate needs frames the canvas without a single overlap.
 */
export const ExamMode: Story = {
  render: () => (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:exambar" region="header" inset="auto">
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

      <ApollonControl id="host:problem" region="right-rail" inset="auto">
        <RailPanel heading="Your task">
          Draw an activity diagram for the <b>checkout</b> process. You have{" "}
          <b>42 minutes</b> of working time remaining. Your work saves
          automatically.
        </RailPanel>
      </ApollonControl>

      <ApollonControl id="host:submit" region="footer" inset="auto">
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
 * **Help as a control** — the standalone's "How to use this editor" content,
 * surfaced as an in-canvas corner control that toggles a floating help card,
 * instead of a header menu entry that lives outside the editor.
 */
export const HelpAsControl: Story = {
  render: () => <HelpStory />,
}

function HelpStory() {
  const [open, setOpen] = useState(false)
  const region: OverlayRegion = "top-right"
  return (
    <Apollon
      defaultModel={fixtureByType.ClassDiagram}
      enablePopups
      style={FULLSCREEN}
    >
      <ApollonControl id="host:help" region={region}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="How to use this editor"
            aria-expanded={open}
            style={{
              ...glass,
              width: 38,
              height: 38,
              justifyContent: "center",
              borderRadius: 999,
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ?
          </button>
          {open && (
            <div
              style={{
                ...glass,
                flexDirection: "column",
                alignItems: "stretch",
                width: 280,
                padding: 16,
                gap: 8,
              }}
            >
              <strong>How to use this editor</strong>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>
                  • Drag an element from the left palette onto the canvas.
                </div>
                <div>• Hover an element and drag from its edge to connect.</div>
                <div>• Double-click to rename · ⌫ to delete.</div>
                <div>• ⌘Z / ⌘⇧Z to undo / redo.</div>
              </div>
            </div>
          )}
        </div>
      </ApollonControl>

      <Apollon.Palette />
      <Apollon.Zoom region="bottom-left" />
      <Apollon.MiniMap region="bottom-right" />
    </Apollon>
  )
}
