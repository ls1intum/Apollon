import type { UMLModel } from "@tumaet/apollon"

/**
 * A model node arrived without usable dimensions. Carries a stable `code` so the
 * worker boundary (which serializes errors to a string and loses the class) can
 * relay it and the route can map it to a 422 — see conversion-resource.
 */
export class InvalidModelGeometryError extends Error {
  readonly code = "INVALID_MODEL_GEOMETRY"
  constructor(message: string) {
    super(message)
    this.name = "InvalidModelGeometryError"
  }
}

const isPositiveFinite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0

/**
 * Assert every node carries real, positive width/height/measured dimensions.
 *
 * Server-side rendering used to silently seed a missing dimension with 100×50,
 * which mis-sized a node in a *graded* export with no signal. Real v4
 * submissions always carry measured dimensions (the type makes them
 * non-optional), so a missing/zero/NaN one means corrupt input — fail loud,
 * naming the node, instead of fabricating a box. `??` would not catch `0`, so
 * this checks `> 0` explicitly.
 */
export function assertValidNodeGeometry(model: UMLModel): void {
  for (const node of model.nodes ?? []) {
    const m = node.measured
    if (
      !isPositiveFinite(node.width) ||
      !isPositiveFinite(node.height) ||
      !isPositiveFinite(m?.width) ||
      !isPositiveFinite(m?.height)
    ) {
      throw new InvalidModelGeometryError(
        `Node "${node.id}" (${node.type}) has invalid dimensions ` +
          `(width=${node.width}, height=${node.height}, ` +
          `measured=${m?.width}×${m?.height}); cannot export faithfully.`
      )
    }
  }
}
