import React from "react"
import { useAssessmentSelection } from "@/hooks/useAssessmentSelection"
import { useDiagramStore, useMetadataStore } from "@/store"
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
  const { mode, readonly, view, enableQuizMode } = useMetadataStore(
    useShallow((state) => ({
      mode: state.mode,
      readonly: state.readonly,
      view: state.view,
      enableQuizMode: state.enableQuizMode,
    }))
  )
  const { isElementInteractive, toggleInteractiveElement } = useDiagramStore(
    useShallow((state) => ({
      isElementInteractive: state.isElementInteractive,
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
    enableQuizMode &&
    mode === ApollonMode.Modelling &&
    view === ApollonView.Highlight &&
    !readonly
  const isInteractiveSelected = isElementInteractive(elementId)

  if (showInteractiveInteraction) {
    const handleInteractiveClick = (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      toggleInteractiveElement(elementId)
    }

    if (asElement == "g") {
      return (
        <g
          style={{
            cursor: "pointer",
            ...(isInteractiveSelected && {
              filter: "drop-shadow(0 0 4px rgba(25, 118, 210, 0.75))",
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
        style={{
          cursor: "pointer",
          ...(isInteractiveSelected && {
            outline: "2px solid #1976d2",
            outlineOffset: "2px",
            backgroundColor: "rgba(25, 118, 210, 0.12)",
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
      style={combinedStyle}
      onPointerDown={handleElementClick}
      onMouseEnter={handleElementMouseEnter}
      onMouseLeave={handleElementMouseLeave}
    >
      {children}
    </div>
  )
}
