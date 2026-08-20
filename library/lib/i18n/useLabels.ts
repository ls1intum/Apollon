import { useMetadataStore } from "@/store/context"
import type { ResolvedApollonLabels } from "./labels"

/** The editor's active label set (English defaults merged with host overrides).
 *  Reactive — a host swapping `labels` re-renders chrome without a remount. */
export const useLabels = (): ResolvedApollonLabels =>
  useMetadataStore((s) => s.labels)
