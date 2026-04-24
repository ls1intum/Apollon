import { v4 as uuidv4 } from "uuid"

export const generateUUID = () => uuidv4()
export * from "./layoutUtils"
export * from "./textUtils"
export * from "./popoverUtils"
export * from "./quadrantUtils"
export * from "./nodeUtils"
export * from "./edgeUtils"
export * from "./exportUtils"
export * from "./diagramTypeUtils"
export * from "./storeUtils"
export * from "./deepPartial"
export * from "./bpmnConstraints"
export * from "./versionConverter"
export * from "./labelUtils"
export * from "./alignmentUtils"
export * from "./requiredInterfaceUtils"
// Deliberately narrow: only the helpers that node SVGs genuinely need to
// reach for get re-exported through the public barrel. Internal machinery
// (the prepared-text cache, `toCanvasFont`, `clearPrepareCache`, type
// aliases, the `layoutTextInShape` kernel) stays module-private so we can
// evolve the measurement backend without it counting as a breaking API
// change.
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
