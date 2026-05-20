// Public surface. Anything not re-exported here is either (a) reachable via
// `./internals` (unstable) or (b) intentionally private. Avoid `export *`
// from utility barrels — those leak helpers we don't want to support.
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
export * from "./utils"
export { log, setLogLevel, setLogger } from "./logger"
export type { LogLevel } from "./logger"
