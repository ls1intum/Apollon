import React from "react"
import { INTERACTIVE_SELECTION_COLOR } from "@/constants"
import { useAssessmentSelection } from "@/hooks/useAssessmentSelection"
import {
  useAssessmentSelectionStore,
  useDiagramStore,
  useMetadataStore,
} from "@/store"
import { ApollonMode, ApollonView } from "@/typings"
import { useShallow } from "zustand/shallow"

interface AssessmentSelectableWrapperProps {
  elementId: string
  children: React.ReactNode
  asElement?: "div" | "g"
}

/**
 * Wrapper component that adds assessment selection capabilities to any element
 */
export const AssessmentSelectableWrapper: React.FC<
  AssessmentSelectableWrapperProps
> = ({ elementId, children, asElement = "div" }) => {
  const { mode, readonly, view } = useMetadataStore(
    useShallow((state) => ({
      mode: state.mode,
      readonly: state.readonly,
      view: state.view,
    }))
  )
  const { isInteractiveSelected, toggleInteractiveElement } = useDiagramStore(
    useShallow((state) => ({
      isInteractiveSelected:
        state.interactiveElements[elementId] ||
        state.interactiveRelationships[elementId] ||
        false,
      toggleInteractiveElement: state.toggleInteractiveElement,
    }))
  )
  const {
    isSelected,
    isHighlighted,
    showAssessmentInteraction,
    handleElementClick,
    handleElementMouseEnter,
    handleElementMouseLeave,
  } = useAssessmentSelection(elementId)

  const showInteractiveInteraction =
    mode === ApollonMode.Modelling &&
    view === ApollonView.Highlight &&
    !readonly

  // Host-driven highlight (assessment "missing feedback" / Athena suggestions):
  // a translucent tint + ring over div-wrapped nodes, a stroke glow over
  // g-wrapped edges. Rendered wherever elements are displayed or assessed — not
  // in the element picker (ApollonView.Highlight), which the
  // assessment hosts never enter.
  const highlightColor = useAssessmentSelectionStore(
    (state) => state.highlightedElements[elementId]
  )
  // Drawn UNDER the element it marks. A positioned overlay normally paints above
  // every static descendant, so both a filled tint and a ring landed on top of
  // the assessment badge (check / cross / alert) sitting at the node's edge.
  // `zIndex: -1` moves it behind the node's own content — the wrapper isolates
  // below, so the negative index cannot escape into the canvas — and the ring
  // still reads because it extends past the node's box, where nothing else
  // paints. Edges get the equivalent glow from `.apollon-edge-highlight`.
  const highlightDivOverlay = highlightColor ? (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        boxShadow: `0 0 0 3px ${highlightColor}`,
        borderRadius: 2,
        pointerEvents: "none",
        zIndex: -1,
      }}
    />
  ) : null
  // An SVG `filter` applies to the whole subtree, and an edge's group contains
  // its assessment badge as well as its stroke — so filtering the group tinted
  // the badge with the highlight colour. Hand the colour down as a custom
  // property instead and let the stylesheet glow only the stroke itself.
  const highlightEdgeVars = highlightColor
    ? ({ "--apollon-edge-highlight": highlightColor } as React.CSSProperties)
    : undefined

  if (showInteractiveInteraction) {
    const handleInteractiveClick = (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      toggleInteractiveElement(elementId)
    }

    if (asElement == "g") {
      return (
        <g
          className={`nodrag nopan apollon-highlight apollon-highlight--picker${
            isInteractiveSelected ? " apollon-highlight--selected" : ""
          }`}
          data-apollon-element-id={elementId}
          style={{
            cursor: "pointer",
            ...(isInteractiveSelected && {
              filter: `drop-shadow(0 0 4px ${INTERACTIVE_SELECTION_COLOR})`,
            }),
          }}
          onPointerDown={handleInteractiveClick}
        >
          {children}
        </g>
      )
    }

    return (
      <div
        className={`nodrag nopan apollon-highlight apollon-highlight--picker${
          isInteractiveSelected ? " apollon-highlight--selected" : ""
        }`}
        data-apollon-element-id={elementId}
        style={{ cursor: "pointer" }}
        onPointerDown={handleInteractiveClick}
      >
        {children}
      </div>
    )
  }

  if (!showAssessmentInteraction) {
    // Nothing to draw — render children bare so ordinary modelling adds no DOM.
    if (!highlightColor) return <>{children}</>
    if (asElement == "g") {
      return (
        <g
          data-apollon-element-id={elementId}
          className="apollon-edge-highlight"
          style={highlightEdgeVars}
        >
          {children}
        </g>
      )
    }
    // A bare relative box is layout-neutral but gives the absolutely-positioned
    // overlay a containing block anchored to the node content box (like every
    // other branch).
    return (
      <div
        data-apollon-element-id={elementId}
        style={{ position: "relative", isolation: "isolate" }}
      >
        {children}
        {highlightDivOverlay}
      </div>
    )
  }

  // Assessment marks elements with the SAME highlight treatment as the
  // element picker — one visual language, one stylesheet, one set of tokens.
  // `--selected` is the committed state, `--highlighted` the transient hover.
  const highlightClass = [
    "apollon-highlight",
    isSelected
      ? "apollon-highlight--selected"
      : isHighlighted
        ? "apollon-highlight--highlighted"
        : "",
  ]
    .filter(Boolean)
    .join(" ")

  const combinedStyle: React.CSSProperties = {
    cursor: "pointer",
    ...(highlightColor && { position: "relative", isolation: "isolate" }),
  }

  if (asElement == "g") {
    const gStyle = {
      cursor: "pointer",
      ...highlightEdgeVars,
    }

    return (
      <g
        className={`nodrag nopan ${highlightClass}${
          highlightColor ? " apollon-edge-highlight" : ""
        }`}
        data-apollon-element-id={elementId}
        style={gStyle}
        onPointerDown={handleElementClick}
        onMouseEnter={handleElementMouseEnter}
        onMouseLeave={handleElementMouseLeave}
      >
        {children}
      </g>
    )
  }
  return (
    <div
      className={`nodrag nopan ${highlightClass}`}
      data-apollon-element-id={elementId}
      style={combinedStyle}
      onPointerDown={handleElementClick}
      onMouseEnter={handleElementMouseEnter}
      onMouseLeave={handleElementMouseLeave}
    >
      {children}
      {highlightDivOverlay}
    </div>
  )
}
