import { CustomEdgeProps } from "@/edges/EdgeProps"
import { IPoint } from "@/edges/Connection"
import {
  DEFAULT_ER_CF_SOURCE_CARDINALITY,
  DEFAULT_ER_CF_TARGET_CARDINALITY,
  ErCfCardinality,
} from "@/types/nodes/enums/EntityRelationshipType"

// Pure rendering/edit logic for the crow's-foot relationship edge, factored out
// of the React components so it can be unit-tested without a React Flow context.

export interface ErCfMarkerSpec {
  cardinality: ErCfCardinality
  // Angle (radians) pointing INTO the entity at this end.
  direction: number
}

export interface ErCfEdgeRender {
  dashed: boolean
  source: ErCfMarkerSpec
  target: ErCfMarkerSpec
}

/**
 * Derive what a crow's-foot edge draws: a dashed line when non-identifying, and
 * a cardinality + into-the-entity direction for each end (the target marker
 * follows the source→target line; the source marker is the reverse). Cardinality
 * falls back to the shared defaults when the edge omits it.
 */
export function deriveErCfEdgeRender(
  data: CustomEdgeProps | undefined,
  sourcePoint: IPoint,
  targetPoint: IPoint
): ErCfEdgeRender {
  const intoTarget = Math.atan2(
    targetPoint.y - sourcePoint.y,
    targetPoint.x - sourcePoint.x
  )
  return {
    dashed: data?.identifying === false,
    source: {
      cardinality: data?.sourceCardinality ?? DEFAULT_ER_CF_SOURCE_CARDINALITY,
      direction: intoTarget + Math.PI,
    },
    target: {
      cardinality: data?.targetCardinality ?? DEFAULT_ER_CF_TARGET_CARDINALITY,
      direction: intoTarget,
    },
  }
}

/**
 * The per-end cardinalities are directional, so when "Swap ends" exchanges the
 * endpoints the cardinalities must move with them — otherwise a "1 → 0..*"
 * relationship silently becomes "0..* → 1". `identifying` is symmetric and is
 * deliberately left untouched.
 */
export function swapErCfCardinalities(
  data: CustomEdgeProps | undefined
): Pick<CustomEdgeProps, "sourceCardinality" | "targetCardinality"> {
  return {
    sourceCardinality: data?.targetCardinality,
    targetCardinality: data?.sourceCardinality,
  }
}
