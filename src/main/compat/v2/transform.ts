import { UMLModel } from '../../typings';
import { UMLModelV2 } from './typings';


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
