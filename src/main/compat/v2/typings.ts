import { UMLModel, UMLDiagramType, UMLElement, UMLRelationship, Assessment } from '../../typings';


export type SelectionV2 = {
  elements: string[],
  relationships: string[],
};


export type UMLModelV2 = {
  version: `2.${number}.${number}`;
  type: UMLDiagramType;
  size: { width: number; height: number };
  elements: UMLElement[];
  interactive: SelectionV2;
  relationships: UMLRelationship[];
  assessments: Assessment[];
};


export type UMLModelCompat = UMLModel | UMLModelV2;


export function isV2(model: UMLModelCompat): model is UMLModelV2 {
  return model.version.startsWith('2.');
}
