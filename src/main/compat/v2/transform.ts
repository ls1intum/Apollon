import { UMLModel } from '../../typings';
import { UMLModelV2 } from './typings';

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
    relationships: model.relationships.reduce((acc, val) => ({ ...acc, [val.id]: val }), {}),
    assessments: model.assessments.reduce((acc, val) => ({ ...acc, [val.modelElementId]: val }), {}),
    interactive: {
      elements: model.interactive.elements.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
      relationships: model.interactive.relationships.reduce((acc, val) => ({ ...acc, [val]: true }), {}),
    },
  };
}
