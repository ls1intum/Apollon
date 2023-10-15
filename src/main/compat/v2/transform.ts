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
  return {
    ...model,
    version: '3.0.0',
    elements: model.elements.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    relationships: model.relationships
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
    assessments: model.assessments.reduce((acc, val) => ({ ...acc, [val.modelElementId]: val }), {}),
    interactive: {
      elements: model.interactive.elements.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
      relationships: model.interactive.relationships.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
    },
  };
}
