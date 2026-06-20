"use client"
// React-only entry — externalizes React, MUI, emotion, xyflow.
// The vite config adds a runtime `"use client"` banner because Rollup strips
// source-level directives during bundling.
export * from "./index"
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
