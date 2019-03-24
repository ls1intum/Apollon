import { DiagramType } from './domain/plugins/DiagramType';
import ElementKind from './domain/plugins/ElementKind';
import RelationshipKind from './domain/plugins/RelationshipKind';
import Styles from './components/Theme/Styles';

export interface UMLModel {
  version: string;
  type: DiagramType;
  size: { width: number; height: number };
  interactive: Selection;
  assessments: { [id: string]: Assessment };
  elements: { [id: string]: UMLElement };
  relationships: { [id: string]: UMLRelationship };
}

export interface Assessment {
  score: number;
  feedback?: string;
}

export { DiagramType };
export { ElementKind as ElementType };
export { RelationshipKind as RelationshipType };
export { Styles };
export {
  UMLClassMember,
  UMLClassifier,
  UMLClassAssociation,
} from './domain/plugins/ClassDiagram';

export interface Element {
  id: string;
  name: string;
  type: ElementKind | RelationshipKind;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface UMLElement extends Element {
  owner: string | null;
  type: ElementKind;
}

export enum Direction {
  Up = 'Up',
  Right = 'Right',
  Down = 'Down',
  Left = 'Left',
}

export interface UMLRelationship extends Element {
  type: RelationshipKind;
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
