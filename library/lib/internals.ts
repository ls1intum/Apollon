// Unstable surface: collaboration + version-migration primitives for host
// integration tests. NOT covered by semver — do not import from application
// code. Public consumers should use the documented `ApollonEditor` /
// `importDiagram` API.

// Yjs wire-protocol primitives.
export { YjsSync, MessageType } from "./sync/yjsSync"
export type { SendBroadcastMessage } from "./sync/yjsSync"
export { createHeadlessSync } from "./sync/headless"

// Version-migration internals. `importDiagram` (root export) is the public
// entry; everything else here lets a host introspect or test the conversion
// pipeline against a frozen wire format. These names are *internal* and
// may change in any release.
export {
  convertV2ToV4,
  convertV3ToV4,
  convertV3HandleToV4,
  convertV3NodeTypeToV4,
  convertV3EdgeTypeToV4,
  convertV3MessagesToV4,
  isV2Format,
  isV3Format,
  isV4Format,
} from "./utils/versionConverter"
export type * from "./utils/v3Typings"
