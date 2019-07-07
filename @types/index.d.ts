declare namespace Apollon {
  export type ApollonMode = import('../src/services/editor/editor-types').ApollonMode;
  export type Locale = import('../src/services/editor/editor-types').Locale;
  export type UMLDiagramType = import('../src/packages/diagram-type').UMLDiagramType;
  export type UMLElementType = import('../src/packages/uml-element-type').UMLElementType;
  export type UMLRelationshipType = import('../src/packages/uml-relationship-type').UMLRelationshipType;
  export type Direction = import('../src/services/uml-element/uml-element-port').Direction;
  export type IBoundary = import('../src/utils/geometry/boundary').IBoundary;
  export type IPath = import('../src/utils/geometry/path').IPath;
  export type Styles = import('../src/components/theme/styles').Styles;
  export type DeepPartial<T> = import('redux').DeepPartial<T>;

  export type ApollonOptions = {
    type?: UMLDiagramType;
    mode?: Mode;
    readonly?: boolean;
    enablePopups?: boolean;
    model?: UMLModel;
    theme?: DeepPartial<Styles>;
    locale?: Locale;
  };

  export type Selection = {
    elements: string[];
    relationships: string[];
  };

  export type UMLModel = {
    elements: UMLElement[];
    interactive: Selection;
    relationships: UMLRelationship[];
    assessments: Assessment[];
  };

  export type UMLModelElement = {
    id: string;
    name: string;
    type: UMLElementType | UMLRelationshipType | UMLDiagramType;
    owner: string | null;
    bounds: IBoundary;
  };

  export type UMLElement = UMLModelElement & {
    type: UMLElementType;
  };

  export type UMLRelationship = UMLModelElement & {
    type: UMLRelationshipType;
    path: IPath;
    source: {
      element: string;
      direction: Direction;
    };
    target: {
      element: string;
      direction: Direction;
    };
  };

  export type UMLClassifier = UMLElement & {
    attributes: string[];
    methods: string[];
  };

  export type UMLAssociation = UMLRelationship & {
    source: UMLRelationship['source'] & {
      multiplicity: string;
      role: string;
    };
    target: UMLRelationship['target'] & {
      multiplicity: string;
      role: string;
    };
  };

  export type Assessment = {
    modelElementId: string;
    elementType: UMLElementType | UMLRelationshipType;
    score: number;
    feedback?: string;
  };

  export type ExportOptions = {
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    keepOriginalSize?: boolean;
    include?: string[];
    exclude?: string[];
  };

  export type SVG = {
    svg: string;
    clip: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}
