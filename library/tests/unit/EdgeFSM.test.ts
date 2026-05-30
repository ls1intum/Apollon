import { describe, it, expect } from "vitest"
import {
  edgeFSMReducer,
  initialEdgeFSMState,
} from "@/edges/interactions/EdgeFSM"
import { EdgeInteractionEvent, FSMState } from "@/edges/interactions/types"

describe("EdgeFSM", () => {
  it("starts in IDLE state", () => {
    expect(initialEdgeFSMState.value).toBe("IDLE")
  })

  it("transitions to DRAGGING_SOURCE on POINTER_DOWN with source target", () => {
    const event: EdgeInteractionEvent = {
      type: "POINTER_DOWN",
      payload: { point: { x: 10, y: 10 }, targetType: "source" },
    }
    const state = edgeFSMReducer(initialEdgeFSMState, event)
    expect(state.value).toBe("DRAGGING_SOURCE")
    expect(state.context.initialPoint).toEqual({ x: 10, y: 10 })
  })

  it("transitions to DRAGGING_TARGET on POINTER_DOWN with target", () => {
    const event: EdgeInteractionEvent = {
      type: "POINTER_DOWN",
      payload: { point: { x: 20, y: 20 }, targetType: "target" },
    }
    const state = edgeFSMReducer(initialEdgeFSMState, event)
    expect(state.value).toBe("DRAGGING_TARGET")
    expect(state.context.initialPoint).toEqual({ x: 20, y: 20 })
  })

  it("transitions to DRAGGING_MIDPOINT on POINTER_DOWN with midpoint and index", () => {
    const event: EdgeInteractionEvent = {
      type: "POINTER_DOWN",
      payload: {
        point: { x: 30, y: 30 },
        targetType: "midpoint",
        waypointIndex: 1,
      },
    }
    const state = edgeFSMReducer(initialEdgeFSMState, event)
    expect(state.value).toBe("DRAGGING_MIDPOINT")
    expect(state.context.initialPoint).toEqual({ x: 30, y: 30 })
    expect(state.context.waypointIndex).toBe(1)
  })

  it("updates currentPoint on POINTER_MOVE while dragging", () => {
    const initialState: FSMState = {
      value: "DRAGGING_TARGET",
      context: { initialPoint: { x: 0, y: 0 }, currentPoint: { x: 0, y: 0 } },
    }
    const event: EdgeInteractionEvent = {
      type: "POINTER_MOVE",
      payload: { point: { x: 100, y: 100 } },
    }
    const state = edgeFSMReducer(initialState, event)
    expect(state.value).toBe("DRAGGING_TARGET")
    expect(state.context.currentPoint).toEqual({ x: 100, y: 100 })
  })

  it("returns to IDLE on POINTER_UP", () => {
    const initialState: FSMState = {
      value: "DRAGGING_SOURCE",
      context: { initialPoint: { x: 0, y: 0 }, currentPoint: { x: 10, y: 10 } },
    }
    const event: EdgeInteractionEvent = { type: "POINTER_UP" }
    const state = edgeFSMReducer(initialState, event)
    expect(state.value).toBe("IDLE")
  })

  it("returns to IDLE on CANCEL", () => {
    const initialState: FSMState = {
      value: "DRAGGING_MIDPOINT",
      context: { initialPoint: { x: 0, y: 0 }, currentPoint: { x: 10, y: 10 } },
    }
    const event: EdgeInteractionEvent = { type: "CANCEL" }
    const state = edgeFSMReducer(initialState, event)
    expect(state.value).toBe("IDLE")
  })
})
