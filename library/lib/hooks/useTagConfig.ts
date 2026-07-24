import { useMetadataStore } from "@/store/context"
import type { TagConfig } from "@/utils/tagUtils"

/** The editor's resolved tag configuration (disabled unless a host opts in). */
export const useTagConfig = (): TagConfig =>
  useMetadataStore((state) => state.tagConfig)
