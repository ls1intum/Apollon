"use client"
// Entry for the `@tumaet/apollon/react` subpath. Re-exports the full standalone
// surface plus the React-only bindings. The `<Apollon>` component lives here
// because only this build externalizes React — exporting it from the bundled
// entry would wire callers to a second, private React copy ("invalid hook call").
export * from "./index"
export { Apollon, type ApollonProps } from "./components/react/Apollon"
export {
  ApollonProvider,
  useApollonEditor,
  useApollonEditorOrThrow,
} from "./components/react/context"
export { useApollonSubscription } from "./components/react/useApollonSubscription"
