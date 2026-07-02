import { useMetadataStore } from "@/store/context"
import type { ApollonLabels } from "./labels"

/** The editor's active label set (English defaults merged with host overrides).
 *  Reactive — a host swapping `labels` re-renders chrome without a remount. */
export const useLabels = (): ApollonLabels => useMetadataStore((s) => s.labels)
