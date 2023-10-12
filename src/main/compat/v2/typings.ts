import { UMLModel, UMLDiagramType, UMLElement, UMLRelationship, Assessment } from '../../typings';

/**
 *
 * Represents the selection type in V2 schema.
 *
 */
export type SelectionV2 = {
  elements: string[];
  relationships: string[];
};

/**
 *
 * Represents the V2 model.
 *
 * @todo This type definition reuses unchanged elements from latest model version.
 *      This is not ideal, as future maintainers modifying the latest model might make
 *      changes that would then need to be reflected here. Ideally, model definitions for
 *      different versions should be completely separate, though that results in a lot of
 *      code duplication.
 *
 */
export type UMLModelV2 = {
  version: `2.${number}.${number}`;
  type: UMLDiagramType;
  size: { width: number; height: number };
  elements: UMLElement[];
  interactive: SelectionV2;
  relationships: UMLRelationship[];
  assessments: Assessment[];
};

/**
 *
 * Represents a model compatible with either V2 or latest version.
 *
 */
export type UMLModelCompat = UMLModel | UMLModelV2;

/**
 *
 * Returns whether the given model is a V2 model.
 *
 * @param {UMLModelCompat} model model to check
 * @returns {boolean} `true` if the model is a V2 model, `false` otherwise
 *
 */
export function isV2(model: UMLModelCompat): model is UMLModelV2 {
  return model.version.startsWith('2.');
}
