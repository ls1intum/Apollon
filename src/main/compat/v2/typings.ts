import { Assessment, UMLDiagramType, UMLElement, UMLModel, UMLRelationship, UMLRelationshipType } from '../../typings';

/**
 *
 * Represents a communication link in V2 schema.
 *
 */
export type UMLCommunicationLinkV2 = UMLRelationship & {
  messages: {
    id: string;
    name: string;
    direction: 'source' | 'target';
  }[];
};

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
 * Represents the relationship type in V2 schema.
 *
 */
export type UMLRelationshipV2 = UMLRelationship | UMLCommunicationLinkV2;

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
  relationships: UMLRelationshipV2[];
  assessments: Assessment[];
};

/**
 *
 * Represents a relationship compatible with either V2 or latest version.
 *
 */
export type UMLRelationshipCompat = UMLRelationship | UMLRelationshipV2;

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

/**
 *
 * Returns whether given relationship is a communication link in v2 schema.
 *
 * @param {UMLRelationship} rel relationship to check
 * @returns {boolean} `true` if the relationship is a communication link, `false` otherwise.
 *
 */
export function isCommunicationLink(rel: UMLRelationship): rel is UMLCommunicationLinkV2 {
  return rel.type === UMLRelationshipType.CommunicationLink;
}
