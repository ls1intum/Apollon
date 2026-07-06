export { generateUUID } from "@/constants"
export * from "./layoutUtils"
export * from "./textUtils"
export * from "./popoverUtils"
export * from "./quadrantUtils"
export * from "./nodeUtils"
export * from "./edgeUtils"
export * from "./exportUtils"
export * from "./diagramTypeUtils"
export * from "./storeUtils"
export * from "./stereotypeLabel"
export * from "./bpmnConstraints"
export * from "./swimlaneUtils"
// Only `importDiagram` is public; the V2/V3 convert helpers and format
// detectors live in `@tumaet/apollon/internals` (internal/unstable).
export { importDiagram } from "./versionConverter"
export * from "./alignmentUtils"
export * from "./requiredInterfaceUtils"
export * from "./collaboration"
// Deliberately narrow: only the helpers that node SVGs genuinely need to
// reach for get re-exported through the public barrel. Internal machinery
// (the prepared-text cache, `toCanvasFont`, `clearPrepareCache`, type
// aliases, the `layoutTextInShape` kernel) stays module-private so we can
// evolve the measurement implementation without it counting as a
// breaking API change.
export {
  wrapTextInRect,
  layoutTextInEllipse,
  layoutTextInDiamond,
  maxLinesForHeight,
} from "./svgTextLayout"
export type {
  WrappedText,
  ShapeLayout,
  SvgFontSpec,
  WhiteSpaceMode,
} from "./svgTextLayout"
