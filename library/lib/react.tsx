// Entry for the `@tumaet/apollon/react` subpath.
//
// Re-exports everything the standalone `@tumaet/apollon` entry exposes, plus
// the `<Apollon>` React component. The component lives ONLY here: it renders
// on the host's React, and only this peer-dependency build externalizes
// React. Exporting it from the bundled entry would hand callers a component
// wired to a second, private React copy — an "invalid hook call" by
// construction. Non-React hosts use the `ApollonEditor` class instead.
export * from "./index"
export { Apollon, type ApollonProps } from "./components/react/Apollon"
