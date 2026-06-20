// Public surface. Anything not re-exported here is either reachable via
// `./internals` (unstable) or intentionally private.
export * from "./typings"
export { ApollonEditor } from "./apollon-editor"
export {
  // Artemis-facing assessment helpers (host consumes these directly).
  getAssessmentNameForArtemis,
  getEdgeAssessmentDataById,
  getNodeAssessmentDataByNodeElementId,
  type AssessmentViewData,
} from "./utils/helpers"
// `importDiagram` is the only public version-migration entry. V2/V3 converters
// and format detectors live behind `@tumaet/apollon/internals`.
export { importDiagram } from "./utils/versionConverter"
export { collabColorFromName, randomCollabName } from "./utils/collaboration"
// Build a node's React Flow `handles` for headless rendering (SSR SVG/PNG
// export) from the same connection-anchor model the editor uses, so exported
// edges resolve to the exact points shown on the canvas.
export {
  buildServerRenderHandles,
  type ServerRenderHandle,
} from "./nodes/handles/serverRenderHandles"
// Canonical `side:ratio` anchor encoder — lets SSR hosts build edge handle ids
// that match the editor instead of hardcoding the string format.
export { formatAnchor } from "./nodes/handles/anchorModel"
// Font stack the editor measures and renders with, so consumers that re-render
// or post-process exported diagram text can match it exactly instead of
// hardcoding the family list.
export { FONT_FAMILY } from "./fontStack"
// NOTE: the `./utils` barrel is intentionally NOT re-exported — it holds
// ~90 internal layout/geometry/store helpers that are not part of the
// supported surface. Public helpers are cherry-picked by name above.
export { log, setLogLevel, setLogger } from "./logger"
export type { LogLevel } from "./logger"
