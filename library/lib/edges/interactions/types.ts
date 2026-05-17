import { IPoint } from "@/edges/types"

export type EdgeInteractionState =
  | "IDLE"
  | "DRAGGING_SOURCE"
  | "DRAGGING_TARGET"
  | "DRAGGING_MIDPOINT"

export type EdgeInteractionEvent =
  | {
      type: "POINTER_DOWN"
      payload: {
        point: IPoint
        targetType: "source" | "target" | "midpoint"
        waypointIndex?: number
      }
    }
  | { type: "POINTER_MOVE"; payload: { point: IPoint } }
  | { type: "POINTER_UP" }
  | { type: "CANCEL" }

export type EdgeFSMContext = {
  initialPoint?: IPoint
  currentPoint?: IPoint
  waypointIndex?: number
}

export type FSMState = {
  value: EdgeInteractionState
  context: EdgeFSMContext
}
