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
// Built-in control config (hide / move / re-configure / replace the palette,
// minimap, zoom) — the shape shared by `ApollonOptions.controls`,
// `<Apollon controls>`, and `editor.setControls`.
export type {
  ControlsOptions,
  BuiltInControlKey,
  BuiltInControlConfig,
  ControlPlacement,
  PaletteProps,
  MinimapProps,
  ZoomProps,
} from "./chrome/config"
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
// Public theming API. The helper is bundled from @tumaet/ui into dist, so
// external consumers don't take a dependency on the private workspace package.
export { createApollonTheme, type ApollonTheme } from "@tumaet/ui/theme"

// React surface, exported from the main entry (no separate `/react` entry).
// React is externalized (see vite.config.ts), so these render on the host's
// single React copy; non-React hosts tree-shake them out (package is
// side-effect-free except CSS). The `index` chunk carries a `"use client"`
// banner (vite.config.ts) for Next.js App Router — note it marks the whole
// entry client-only.
export { Apollon, type ApollonProps } from "./components/react/Apollon"
export {
  ApollonProvider,
  useApollonEditor,
  useApollonEditorOrThrow,
} from "./components/react/context"
export { useApollonSubscription } from "./components/react/useApollonSubscription"
// Canvas overlay / control API (React surface): declaratively inject floating
// chrome into the editor canvas.
export {
  ApollonControl,
  type ApollonControlProps,
} from "./components/react/ApollonControl"
