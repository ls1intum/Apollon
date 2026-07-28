import { describe, expect, it } from "vitest"
import {
  exceedsDragThreshold,
  getSegmentGhostHandles,
  insertWaypoint,
  isWaypointCollapseCandidate,
  moveWaypoint,
  pruneCollinearWaypoints,
  removeWaypoint,
  snapPoint,
  snapPointToAngle,
} from "@/utils/geometry/freeWaypoints"
import { EDGES } from "@/utils/geometry/routingConstants"

const p = (x: number, y: number) => ({ x, y })

describe("freeWaypoints", () => {
  describe("snapPoint", () => {
    it("snaps to the bend grid", () => {
      expect(snapPoint(p(11, 3), 5)).toEqual(p(10, 5))
      expect(snapPoint(p(13, 7), 5)).toEqual(p(15, 5))
    })
    it("defaults to the configured grid and is deterministic", () => {
      expect(snapPoint(p(2, 2))).toEqual(snapPoint(p(2, 2)))
    })
  })

  describe("getSegmentGhostHandles", () => {
    it("returns one integer midpoint per long-enough segment", () => {
      const route = [p(0, 0), p(100, 0), p(100, 100)]
      const ghosts = getSegmentGhostHandles(route)
      expect(ghosts.map((g) => g.segmentIndex)).toEqual([0, 1])
      expect(ghosts[0].position).toEqual(p(50, 0))
      expect(ghosts[1].position).toEqual(p(100, 50))
    })
    it("skips segments shorter than the min length so handles never fuse", () => {
      const short = EDGES.WAYPOINT_GHOST_MIN_SEGMENT_PX - 1
      const route = [p(0, 0), p(short, 0), p(short + 100, 0)]
      const ghosts = getSegmentGhostHandles(route)
      expect(ghosts.map((g) => g.segmentIndex)).toEqual([1])
    })
    it("accepts the renderer's zoom-adjusted spacing threshold", () => {
      const route = [p(0, 0), p(100, 0)]

      expect(getSegmentGhostHandles(route, 101)).toEqual([])
      expect(getSegmentGhostHandles(route, 100)).toHaveLength(1)
    })
  })

  describe("insert/move/remove", () => {
    it("inserts on segment i at interior index i", () => {
      // route = [source, target]; segment 0 → interior index 0
      expect(insertWaypoint([], 0, p(51, 49))).toEqual([p(50, 50)])
      // route = [source, w0, target]; last segment index 1 → append
      expect(insertWaypoint([p(50, 50)], 1, p(80, 20))).toEqual([
        p(50, 50),
        p(80, 20),
      ])
      // route = [source, w0, target]; segment 0 → before w0
      expect(insertWaypoint([p(50, 50)], 0, p(20, 20))).toEqual([
        p(20, 20),
        p(50, 50),
      ])
    })
    it("moves and snaps a waypoint, no-op out of range", () => {
      expect(moveWaypoint([p(0, 0), p(50, 50)], 1, p(72, 68))).toEqual([
        p(0, 0),
        p(70, 70),
      ])
      expect(moveWaypoint([p(0, 0)], 5, p(1, 1))).toEqual([p(0, 0)])
    })
    it("removes a waypoint by index", () => {
      expect(removeWaypoint([p(0, 0), p(1, 1), p(2, 2)], 1)).toEqual([
        p(0, 0),
        p(2, 2),
      ])
    })
  })

  describe("pruneCollinearWaypoints", () => {
    it("drops a near-collinear interior point but keeps a genuine bend", () => {
      const source = p(0, 0)
      const target = p(100, 0)
      // Exactly on the line → pruned.
      expect(pruneCollinearWaypoints([source, p(50, 0), target])).toEqual([])
      // Within tolerance → pruned.
      expect(pruneCollinearWaypoints([source, p(50, 2), target])).toEqual([])
      // A real bend survives.
      expect(pruneCollinearWaypoints([source, p(50, 40), target])).toEqual([
        p(50, 40),
      ])
    })
    it("prunes a collinear point on a straight run but keeps the corner", () => {
      // (50,0) lies on source→(100,0); (100,0) is a genuine corner into (100,50).
      const route = [p(0, 0), p(50, 0), p(100, 0), p(100, 50)]
      expect(pruneCollinearWaypoints(route)).toEqual([p(100, 0)])
    })
    it("returns [] for a two-point route", () => {
      expect(pruneCollinearWaypoints([p(0, 0), p(10, 10)])).toEqual([])
    })
  })

  describe("straightening and angle affordances", () => {
    it("magnetically collapses only onto the finite neighbour chord", () => {
      const route = [p(0, 0), p(50, 30), p(100, 0)]
      expect(isWaypointCollapseCandidate(route, 1, p(50, 7), 8)).toBe(true)
      expect(isWaypointCollapseCandidate(route, 1, p(50, 9), 8)).toBe(false)
      expect(isWaypointCollapseCandidate(route, 1, p(120, 0), 8)).toBe(false)
    })

    it("locks a dragged waypoint to 15-degree increments around its neighbour", () => {
      expect(snapPointToAngle(p(100, 5), p(0, 0))).toEqual(p(100, 0))
      expect(snapPointToAngle(p(90, 52), p(0, 0))).toEqual(p(90, 52))
    })
  })

  describe("exceedsDragThreshold", () => {
    it("is false below and true above the threshold", () => {
      const t = EDGES.WAYPOINT_DRAG_THRESHOLD_PX
      expect(exceedsDragThreshold(p(0, 0), p(t - 1, 0))).toBe(false)
      expect(exceedsDragThreshold(p(0, 0), p(t + 1, 0))).toBe(true)
    })
  })
})
