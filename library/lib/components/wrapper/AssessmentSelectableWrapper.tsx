import React from "react"
import {
  INTERACTIVE_SELECTION_COLOR,
  INTERACTIVE_SELECTION_FILL,
  INTERACTIVE_SELECTION_FILL_STRONG,
} from "@/constants"
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
  // in the quiz interactive-element picker (ApollonView.Highlight), which the
  // assessment hosts never enter.
  const highlightColor = useAssessmentSelectionStore(
    (state) => state.highlightedElements[elementId]
  )
  const highlightDivOverlay = highlightColor ? (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: highlightColor,
        boxShadow: `0 0 0 2px ${highlightColor}`,
        borderRadius: 2,
        pointerEvents: "none",
      }}
    />
  ) : null
  const highlightEdgeFilter = highlightColor
    ? `drop-shadow(0 0 2px ${highlightColor}) drop-shadow(0 0 2px ${highlightColor})`
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
          className={`nodrag nopan apollon-interactive-selection${
            isInteractiveSelected
              ? " apollon-interactive-selection--selected"
              : ""
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
        className={`nodrag nopan apollon-interactive-selection${
          isInteractiveSelected
            ? " apollon-interactive-selection--selected"
            : ""
        }`}
        data-apollon-element-id={elementId}
        style={{
          cursor: "pointer",
          ...(isInteractiveSelected && {
            outline: `2px solid ${INTERACTIVE_SELECTION_COLOR}`,
            outlineOffset: "2px",
            backgroundColor: INTERACTIVE_SELECTION_FILL,
          }),
        }}
        onPointerDown={handleInteractiveClick}
      >
        {children}
      </div>
    )
  }

  if (!showAssessmentInteraction) {
    // No host highlight is the hot path (99% of renders): return a zero-box
    // Fragment so ordinary modelling/editing pays no extra DOM/layout cost.
    if (!highlightColor) return <>{children}</>
    if (asElement == "g") {
      return (
        <g
          data-apollon-element-id={elementId}
          style={{ filter: highlightEdgeFilter }}
        >
          {children}
        </g>
      )
    }
    // A bare relative box is layout-neutral but gives the absolutely-positioned
    // overlay a containing block anchored to the node content box (like every
    // other branch).
    return (
      <div data-apollon-element-id={elementId} style={{ position: "relative" }}>
        {children}
        {highlightDivOverlay}
      </div>
    )
  }

  const combinedStyle: React.CSSProperties = {
    cursor: "pointer",
    ...(highlightColor && { position: "relative" }),
    ...(isSelected && {
      backgroundColor: INTERACTIVE_SELECTION_FILL,
      border: `2px solid ${INTERACTIVE_SELECTION_COLOR}`,
    }),
    ...(isHighlighted &&
      !isSelected && {
        backgroundColor: INTERACTIVE_SELECTION_FILL_STRONG,
        border: `2px solid ${INTERACTIVE_SELECTION_COLOR}`,
      }),
  }

  if (asElement == "g") {
    const gStyle = {
      cursor: "pointer",
      ...(highlightColor && { filter: highlightEdgeFilter }),
      ...(isSelected && {
        stroke: INTERACTIVE_SELECTION_FILL,
      }),
      ...(isHighlighted &&
        !isSelected && {
          stroke: INTERACTIVE_SELECTION_FILL_STRONG,
        }),
    }

    return (
      <g
        className="nodrag nopan"
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
      className="nodrag nopan"
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
