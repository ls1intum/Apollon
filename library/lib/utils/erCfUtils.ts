import { CustomEdgeProps } from "@/edges/EdgeProps"
import { IPoint } from "@/edges/Connection"
import { getPathStartInfo, getPathEndInfo } from "./pathParsing"
import {
  DEFAULT_ER_CF_SOURCE_CARDINALITY,
  DEFAULT_ER_CF_TARGET_CARDINALITY,
  ErCfCardinality,
} from "@/types/nodes/enums/EntityRelationshipType"

// Pure rendering/edit logic for the crow's-foot relationship edge, factored out
// of the React components so it can be unit-tested without a React Flow context.

export interface ErCfMarkerSpec {
  point: IPoint
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
 * a per-end cardinality marker placed at the entity boundary, oriented along the
 * path's final segment (so the foot stays attached and correctly angled even when
 * the step-routed edge bends). The target marker follows the segment entering the
 * target; the source marker is the reverse of the segment leaving the source. Both
 * fall back to the straight source→target line before the path is laid out, and
 * cardinality falls back to the shared defaults.
 */
export function deriveErCfEdgeRender(
  data: CustomEdgeProps | undefined,
  currentPath: string,
  sourcePoint: IPoint,
  targetPoint: IPoint
): ErCfEdgeRender {
  const straight = Math.atan2(
    targetPoint.y - sourcePoint.y,
    targetPoint.x - sourcePoint.x
  )
  const start = getPathStartInfo(currentPath)
  const end = getPathEndInfo(currentPath)
  return {
    dashed: data?.identifying === false,
    source: {
      point: sourcePoint,
      cardinality: data?.sourceCardinality ?? DEFAULT_ER_CF_SOURCE_CARDINALITY,
      // getPathStartInfo already points INTO the source; the straight fallback
      // points OUT (toward the target), so reverse only that case.
      direction: start ? start.direction : straight + Math.PI,
    },
    target: {
      point: targetPoint,
      cardinality: data?.targetCardinality ?? DEFAULT_ER_CF_TARGET_CARDINALITY,
      // end.direction already enters the target.
      direction: end ? end.direction : straight,
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
