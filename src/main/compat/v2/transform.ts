import { UMLCommunicationLink, UMLModel, UMLRelationshipType } from '../../typings';
import { UMLModelV2, isCommunicationLink } from './typings';

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
      .map((relationship) => {
        if (isCommunicationLink(relationship)) {
          return {
            ...relationship,
            messages: relationship.messages.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
          } as UMLCommunicationLink;
        } else {
          return relationship;
        }
      })
      .reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    assessments: assessments.reduce((acc, val) => ({ ...acc, [val.modelElementId]: val }), {}),
    interactive: {
      elements: interactive.elements.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
      relationships: interactive.relationships.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
    },
  };
}
