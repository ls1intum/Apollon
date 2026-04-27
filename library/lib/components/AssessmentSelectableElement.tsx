import { INTERACTIVE_SELECTION_COLOR } from "@/constants"
import { useAssessmentSelection } from "@/hooks"
import { useDiagramStore, useMetadataStore } from "@/store"
import { ApollonMode, ApollonView } from "@/typings"
import { FC } from "react"
import { useShallow } from "zustand/shallow"

// Assessment selectable wrapper for SVG elements
interface AssessmentSelectableElementProps {
  elementId: string
  width: number
  itemHeight: number
  yOffset?: number
  children: React.ReactNode
}

export const AssessmentSelectableElement: FC<
  AssessmentSelectableElementProps
> = ({ elementId, width, itemHeight, yOffset = 0, children }) => {
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
    const handleInteractivePointerDown = (
      e: React.PointerEvent<SVGGElement>
    ) => {
      e.stopPropagation()
      e.preventDefault()
      toggleInteractiveElement(elementId)
    }

    return (
      <g
        className="nodrag nopan"
        data-apollon-element-id={elementId}
        style={{ cursor: "pointer" }}
        onPointerDown={handleInteractivePointerDown}
      >
        {children}
        {isInteractiveSelected && (
          <rect
            x={0}
            y={yOffset}
            width={width}
            height={itemHeight}
            fill={INTERACTIVE_SELECTION_COLOR}
            fillOpacity={0.18}
            stroke={INTERACTIVE_SELECTION_COLOR}
            strokeWidth={2}
            rx={2}
            pointerEvents="none"
          />
        )}
      </g>
    )
  }

  if (!showAssessmentInteraction) {
    return <g data-apollon-element-id={elementId}>{children}</g>
  }

  const handleSVGClick = (e: React.PointerEvent<SVGGElement>) => {
    handleElementClick(e as React.PointerEvent<Element>)
  }

  return (
    <g
      className="nodrag nopan"
      data-apollon-element-id={elementId}
      style={{
        cursor: showAssessmentInteraction ? "pointer" : "default",
      }}
      onPointerDown={handleSVGClick}
      onMouseEnter={handleElementMouseEnter}
      onMouseLeave={handleElementMouseLeave}
    >
      {children}
      {/* Selection highlight overlay - rendered after children to be on top */}
      {(isSelected || isHighlighted) && (
        <rect
          x={0}
          y={yOffset}
          width={width}
          height={itemHeight}
          fill={
            isSelected ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)"
          }
          stroke={isSelected ? "#1976d2" : "rgba(25, 118, 210, 0.5)"}
          strokeWidth={isSelected ? 2 : 1}
          rx={2}
          pointerEvents="none"
        />
      )}
    </g>
  )
}
