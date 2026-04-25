import React from "react"
import { useAssessmentSelection } from "@/hooks/useAssessmentSelection"
import { useDiagramStore, useMetadataStore } from "@/store"
import { ApollonMode, ApollonView } from "@/typings"
import { useShallow } from "zustand/shallow"

const INTERACTIVE_SELECTION_COLOR =
  "var(--apollon-interactive-selection, #f39c12)"
const INTERACTIVE_SELECTION_FILL =
  "color-mix(in srgb, var(--apollon-interactive-selection, #f39c12) 18%, transparent)"

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
    return <>{children}</>
  }

  const combinedStyle: React.CSSProperties = {
    cursor: "pointer",
    ...(isSelected && {
      backgroundColor: "rgba(25, 118, 210, 0.2)",
      border: "2px solid #1976d2",
    }),
    ...(isHighlighted &&
      !isSelected && {
        backgroundColor: "rgba(25, 118, 210, 0.5)",
        border: "2px solid #1976d2",
      }),
  }

  if (asElement == "g") {
    const gStyle = {
      cursor: "pointer",
      ...(isSelected && {
        stroke: "rgba(25, 118, 210, 0.2)",
      }),
      ...(isHighlighted &&
        !isSelected && {
          stroke: "rgba(25, 118, 210, 0.5)",
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
    </div>
  )
}
