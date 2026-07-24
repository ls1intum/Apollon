/**
 * Self-contained syntax-tree tidy-layout module.
 *
 * Public entry point is `computeTidyLayout`; the tidy-tree core and the forest
 * reconstruction are exported for direct testing and advanced callers.
 */
export {
  computeTidyLayout,
  DEFAULT_TIDY_OPTIONS,
  type TidyOptions,
  type Forest,
} from "./applyTidyLayout"
export {
  layoutTidyTree,
  type TidyNodeInput,
  type TidyPosition,
} from "./tidyTree"
export { buildSyntaxTreeForest } from "./buildForest"
