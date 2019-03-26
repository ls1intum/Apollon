import { DiagramType } from './domain/plugins/diagram-type';
import { ElementType as UMLElementType } from './domain/plugins/element-type';
import { RelationshipType as UMLRelationshipType } from './domain/plugins/relationship-type';
import Styles from './components/Theme/Styles';

export type ElementType = UMLElementType | UMLRelationshipType;

export interface UMLModel {
  version: string;
  type: DiagramType;
  size: { width: number; height: number };
  interactive: Selection;
  assessments: Assessment[];
  elements: UMLElement[];
  relationships: UMLRelationship[];
}

export interface Assessment {
  modelElementId: string;
  elementType: ElementType;
  score: number;
  feedback?: string;
}

export { DiagramType };
export { UMLElementType };
export { UMLRelationshipType };
export { Styles };
export { UMLClassifier, UMLClassAssociation } from './domain/plugins/ClassDiagram';

export interface Element {
  id: string;
  name: string;
  type: ElementType;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface UMLElement extends Element {
  owner: string | null;
  type: UMLElementType;
}

export enum Direction {
  Up = 'Up',
  Right = 'Right',
  Down = 'Down',
  Left = 'Left',
}

export interface UMLRelationship extends Element {
  type: UMLRelationshipType;
  path: { x: number; y: number }[];
  source: {
    element: string;
    direction: Direction;
  };
  target: {
    element: string;
    direction: Direction;
  };
}

export interface Selection {
  elements: string[];
  relationships: string[];
}

export enum ApollonMode {
  Modelling = 'Modelling',
  Exporting = 'Exporting',
  Assessment = 'Assessment',
}

export type ApollonOptions = {
  type?: DiagramType;
  mode?: ApollonMode;
  readonly?: boolean;
  model?: UMLModel;
  theme?: Partial<Styles>;
};

export type ExportOptions = {
  margin?: number;
  keepOriginalSize?: boolean;
  include?: string[];
  exclude?: string[];
};

export interface SVG {
  svg: string;
  clip: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export * from './ApollonEditor';
