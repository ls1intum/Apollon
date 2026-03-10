import { useMemo, useState, useEffect } from "react"
import { MessageData } from "../edges/EdgeProps"
import { IPoint } from "@/edges"

type ArrowDirection = "Up" | "Down" | "Left" | "Right"

interface MessagePositioningResult {
  forwardMessages: MessageData[]
  backwardMessages: MessageData[]
  sourceArrowDirection: ArrowDirection
  targetArrowDirection: ArrowDirection
  forwardArrowRotation: number
  backwardArrowRotation: number
  forwardArrowBoxPosition: { x: number; y: number }
  forwardLabelBoxPosition: { x: number; y: number }
  backwardArrowBoxPosition: { x: number; y: number }
  backwardLabelBoxPosition: { x: number; y: number }
  isPositioned: boolean
}

export const useMessagePositioning = (
  displayMessages: MessageData[],
  sourcePosition: IPoint,
  targetPosition: IPoint,
  pathMiddlePosition: IPoint,
  edgePoints?: IPoint[],
  isHorizontalEdge?: boolean
): MessagePositioningResult => {
  const [isPositioned, setIsPositioned] = useState(false)

  const positioningData = useMemo(() => {
    // Group messages by direction
    const forwardMessages = displayMessages.filter(
      (msg) => msg.direction === "target"
    )
    const backwardMessages = displayMessages.filter(
      (msg) => msg.direction === "source"
    )

    // Calculate arrow directions based on which node is which relative to the middle
    const sourceIsLeft = sourcePosition.x < targetPosition.x
    const sourceIsAbove = sourcePosition.y < targetPosition.y

    let sourceArrowDirection: ArrowDirection
    let targetArrowDirection: ArrowDirection

    if (isHorizontalEdge) {
      sourceArrowDirection = sourceIsLeft ? "Left" : "Right"
      targetArrowDirection = sourceIsLeft ? "Right" : "Left"
    } else {
      sourceArrowDirection = sourceIsAbove ? "Up" : "Down"
      targetArrowDirection = sourceIsAbove ? "Down" : "Up"
    }

    const calculateRotation = (direction: ArrowDirection): number => {
      switch (direction) {
        case "Right":
          return 0
        case "Left":
          return 180
        case "Down":
          return 90
        case "Up":
          return -90
        default:
          return 0
      }
    }

    const forwardArrowRotation = calculateRotation(targetArrowDirection)
    const backwardArrowRotation = calculateRotation(sourceArrowDirection)

    const baseOffset = 15
    const labelOffset = 12
    const verticalEdgeMessageSpacing = 60

    // Position labels and arrows based on actual middle segment orientation
    let forwardArrowBoxPosition: { x: number; y: number }
    let forwardLabelBoxPosition: { x: number; y: number }
    let backwardArrowBoxPosition: { x: number; y: number }
    let backwardLabelBoxPosition: { x: number; y: number }

    if (isHorizontalEdge) {
      // Horizontal middle segment: messages above and below
      forwardArrowBoxPosition = { x: 0, y: -baseOffset }
      forwardLabelBoxPosition = { x: labelOffset, y: -baseOffset }

      backwardArrowBoxPosition = { x: 0, y: baseOffset }
      backwardLabelBoxPosition = { x: labelOffset, y: baseOffset }
    } else {
      forwardArrowBoxPosition = { x: -verticalEdgeMessageSpacing, y: 0 }
      forwardLabelBoxPosition = { x: -verticalEdgeMessageSpacing - labelOffset, y: 0 }

      backwardArrowBoxPosition = { x: verticalEdgeMessageSpacing, y: 0 }
      backwardLabelBoxPosition = { x: verticalEdgeMessageSpacing + labelOffset, y: 0 }
    }

    return {
      forwardMessages,
      backwardMessages,
      sourceArrowDirection,
      targetArrowDirection,
      forwardArrowRotation,
      backwardArrowRotation,
      forwardArrowBoxPosition,
      forwardLabelBoxPosition,
      backwardArrowBoxPosition,
      backwardLabelBoxPosition,
      isHorizontalEdge,
    }
  }, [
    displayMessages,
    sourcePosition,
    targetPosition,
    pathMiddlePosition,
    isHorizontalEdge,
  ])

  useEffect(() => {
    if (displayMessages && displayMessages.length > 0) {
      const timeout = setTimeout(() => {
        setIsPositioned(true)
      }, 0)

      return () => clearTimeout(timeout)
    } else {
      setIsPositioned(false)
    }
  }, [
    displayMessages,
    sourcePosition,
    targetPosition,
    pathMiddlePosition,
    edgePoints,
  ])

  return {
    ...positioningData,
    isPositioned,
  }
}
