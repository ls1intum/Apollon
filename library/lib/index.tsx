// Public surface. Anything not re-exported here is either reachable via
// `./internals` (unstable) or intentionally private.
export * from "./typings"
export { ApollonEditor } from "./apollon-editor"
// Canvas overlay / control API types — needed by both the imperative and React
// injection paths.
export type {
  OverlayRegion,
  OverlaySide,
  InsetContribution,
  OverlayControlOptions,
  OverlayControlInput,
} from "./overlay/types"
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
// Font stack the editor measures and renders with, so consumers that re-render
// or post-process exported diagram text can match it exactly instead of
// hardcoding the family list.
export { FONT_FAMILY } from "./fontStack"
// NOTE: the `./utils` barrel is intentionally NOT re-exported — it holds
// ~90 internal layout/geometry/store helpers that are not part of the
// supported surface. Public helpers are cherry-picked by name above.
export { log, setLogLevel, setLogger } from "./logger"
export type { LogLevel } from "./logger"
