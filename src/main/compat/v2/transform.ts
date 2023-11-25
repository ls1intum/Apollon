import { UMLCommunicationLink, UMLModel, UMLRelationship } from '../../typings';
import { isCommunicationLink, UMLCommunicationLinkV2, UMLModelV2, UMLRelationshipV2 } from './typings';

/**
 *
 * Converts a v2 relationshuip to a v3 relationship.
 *
 * @param {UMLRelationshipV2} relationship to convert
 * @returns {UMLRelationship} the converted relationship
 */
export function v2RelationshipToV3Relationship(relationship: UMLRelationshipV2): UMLRelationship {
  if (isCommunicationLink(relationship)) {
    return {
      ...relationship,
      messages: relationship.messages.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    } as UMLCommunicationLink;
  } else {
    return relationship;
  }
}

/**
 *
 * Converts a v3 relationship to a v2 relationship.
 *
 * @param {UMLRelationship} relationship to convert
 * @returns {UMLRelationshipV2} the converted relationship
 */
export function v3RelaionshipToV2Relationship(relationship: UMLRelationship): UMLRelationshipV2 {
  if (isCommunicationLink(relationship)) {
    return {
      ...relationship,
      messages: Object.values(relationship.messages),
    } as UMLCommunicationLinkV2;
  } else {
    return relationship;
  }
}

/**
 *
 * Converts a v2 model to a v3 model.
 *
 * @param {UMLModelV2} model model to convert
 * @returns {UMLModel} the converted model
 *
 */
export function v2ModeltoV3Model(model: UMLModelV2): UMLModel {
  const elements = Array.isArray(model.elements) ? model.elements : [];
  const relationships = Array.isArray(model.relationships) ? model.relationships : [];
  const assessments = Array.isArray(model.assessments) ? model.assessments : [];
  const interactive = model.interactive || { elements: [], relationships: [] };

  return {
    ...model,
    version: '3.0.0',
    elements: elements.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    relationships: relationships
      .map(v2RelationshipToV3Relationship)
      .reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    assessments: assessments.reduce((acc, val) => ({ ...acc, [val.modelElementId]: val }), {}),
    interactive: {
      elements: interactive.elements.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
      relationships: interactive.relationships.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
    },
  };
}
