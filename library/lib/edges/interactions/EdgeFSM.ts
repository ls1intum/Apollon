import { EdgeInteractionEvent, FSMState } from "./types"

export const initialEdgeFSMState: FSMState = {
  value: "IDLE",
  context: {},
}

/**
 * A lightweight reducer-based Finite State Machine for edge interactions.
 * It strictly governs the permitted transitions between IDLE, DRAGGING_SOURCE,
 * DRAGGING_TARGET, and DRAGGING_MIDPOINT states.
 */
export function edgeFSMReducer(
  state: FSMState,
  event: EdgeInteractionEvent
): FSMState {
  switch (state.value) {
    case "IDLE":
      if (event.type === "POINTER_DOWN") {
        const { targetType, point, waypointIndex } = event.payload
        if (targetType === "source") {
          return {
            value: "DRAGGING_SOURCE",
            context: { initialPoint: point, currentPoint: point },
          }
        }
        if (targetType === "target") {
          return {
            value: "DRAGGING_TARGET",
            context: { initialPoint: point, currentPoint: point },
          }
        }
        if (targetType === "midpoint") {
          return {
            value: "DRAGGING_MIDPOINT",
            context: {
              initialPoint: point,
              currentPoint: point,
              waypointIndex,
            },
          }
        }
      }
      return state

    case "DRAGGING_SOURCE":
    case "DRAGGING_TARGET":
    case "DRAGGING_MIDPOINT":
      if (event.type === "POINTER_MOVE") {
        return {
          ...state,
          context: {
            ...state.context,
            currentPoint: event.payload.point,
          },
        }
      }
      if (event.type === "POINTER_UP" || event.type === "CANCEL") {
        return initialEdgeFSMState
      }
      return state

    default:
      return state
  }
}
