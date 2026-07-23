/**
 * Worker-safe constants used by the edge-geometry kernel.
 *
 * Keep this leaf module free of React and component imports. `@/constants`
 * re-exports these values for the existing public/internal API, while the
 * routing kernel imports them directly so a module Worker never traverses the
 * UI dependency graph.
 */
export const CANVAS = Object.freeze({
  MIN_SCALE_TO_ZOOM_OUT: 0.4,
  MAX_SCALE_TO_ZOOM_IN: 2.5,
  MOUSE_UP_OFFSET_PX: 5,
  SNAP_TO_GRID_PX: 5,
  EXTRA_SPACE_FOR_EXTENSION: 10,
  PASTE_OFFSET_PX: 20,
} as const)

const INTERFACE_SIZE = 30
const INTERFACE_RADIUS = INTERFACE_SIZE / 2
const INTERFACE_STROKE_WIDTH = 2
const INTERFACE_SOCKET_GAP = 4
// Keep the relationship line visibly separate from the required-interface
// socket. React Flow places its handle center 3px outside the node; routing
// padding accounts for that independently, so this is the actual canvas-space
// air gap between the line endpoint and the socket stroke centerline.
const INTERFACE_EDGE_SOCKET_GAP = 3

export const INTERFACE = Object.freeze({
  SIZE: INTERFACE_SIZE,
  RADIUS: INTERFACE_RADIUS,
  STROKE_WIDTH: INTERFACE_STROKE_WIDTH,
  SOCKET_GAP: INTERFACE_SOCKET_GAP,
  EDGE_SOCKET_GAP: INTERFACE_EDGE_SOCKET_GAP,
} as const)

export const EDGES = Object.freeze({
  /** Negative padding extends target point to node boundary (React Flow handles are offset 3px) */
  MARKER_PADDING: -3,
  /** Positive padding pulls source point back to node boundary (React Flow handles are offset 3px from node edge) */
  SOURCE_CONNECTION_POINT_PADDING: 3,
  /** Border radius for step-style edge corners */
  STEP_BORDER_RADIUS: 0,
  /** Width of the invisible stroke used for edge selection/highlighting */
  EDGE_HIGHLIGHT_STROKE_WIDTH: 15,
  /** Height of the line-jump bridge used when edges cross */
  EDGE_LINE_JUMP_HEIGHT: 10,
  /** Length of the line-jump bridge along the crossed segment */
  EDGE_LINE_JUMP_WIDTH: 16,
  /** Stub length locked to node, matches getSmoothStepPath offset */
  STUB_LENGTH: 30,
  /** Desired breathing room between a route and a node body. */
  NODE_CLEARANCE_PX: 5 * CANVAS.SNAP_TO_GRID_PX,
  /** Clearance below which a legacy step route is considered unfit. */
  MIN_NODE_CLEARANCE_PX: 2 * CANVAS.SNAP_TO_GRID_PX,
  /** Smallest stub retained when facing endpoints are close together. */
  MIN_STUB_LENGTH: CANVAS.SNAP_TO_GRID_PX,
  /** Preferred bend-handle long-axis size in screen pixels. */
  BEND_HANDLE_SCREEN_LENGTH_PX: 34,
  /** Smallest bend-handle long-axis size in screen pixels. */
  BEND_HANDLE_MIN_SCREEN_LENGTH_PX: 18,
  /** Smallest endpoint hit target on a very short edge. */
  MIN_ENDPOINT_HIT_TARGET_PX: 15,
  /** Minimum screen-space clearance between a bend handle and its corners. */
  BEND_HANDLE_CORNER_CLEARANCE_PX: 10,
  /** Node-adjacent safe area excluded from bend handles. */
  BEND_HANDLE_SAFE_AREA_PX: 25,
  /** Size of the invisible endpoint reconnection target. */
  ENDPOINT_HIT_TARGET_SIZE: 24,
  /** Gap between an endpoint target and its nearest bend handle. */
  ENDPOINT_HANDLE_CLEARANCE_PX: 4,
  /** Grid step for dragged bends. */
  BEND_SNAP_GRID_PX: CANVAS.SNAP_TO_GRID_PX,
  /** Maximum same-direction dogleg treated as a rounding artifact. */
  ORTHOGONAL_DOGLEG_TOLERANCE_PX: 2,
  /** Maximum doubled-back arm gap treated as a degenerate overlap. */
  ORTHOGONAL_ARM_OVERLAP_PX: 10,
  /** Gap between an edge and its relationship/stereotype label. */
  LABEL_GAP: 14,
  /** Nominal label line height used by placement scoring. */
  LABEL_LINE_HEIGHT: 14,
  /** Nominal label half-width used by placement scoring. */
  LABEL_NOMINAL_HALF_EXTENT: 40,
} as const)
