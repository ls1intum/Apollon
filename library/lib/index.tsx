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
// Public theming API. The helper is bundled from @tumaet/ui into dist, so
// external consumers don't take a dependency on the private workspace package.
export { createApollonTheme, type ApollonTheme } from "@tumaet/ui/theme"

// React surface. The whole package is built with React externalized (see
// vite.config.ts), so the `<Apollon>` component and its hooks render on the
// host's single React copy — there is no longer a separate `/react` entry, and
// no risk of a second, private React. Non-React hosts (Angular, Vue, vanilla)
// import only the imperative `ApollonEditor`; because this package is
// side-effect-free except for CSS (`sideEffects` in package.json), bundlers
// tree-shake the component and hooks out for those consumers. The published
// `dist/index.js` carries a `"use client"` banner (added in vite.config.ts) so
// the component works in React Server Component / Next.js App Router setups.
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
