import { UMLDiagramType } from 'src/packages/diagram-type';
import { UMLElementType } from 'src/packages/uml-element-type';
import { UMLRelationshipType } from 'src/packages/uml-relationship-type';
import { Direction } from 'src/services/uml-element/uml-element-port';
import { IBoundary } from 'src/utils/geometry/boundary';
import { IPath } from 'src/utils/geometry/path';

declare module '@ls1intum/apollon' {
  namespace Apollon {
    type UMLModel = {
      elements: UMLElement[];
      relationships: UMLRelationship[];
    };

    type UMLModelElement = {
      id: string;
      name: string;
      type: UMLElementType | UMLRelationshipType | UMLDiagramType;
      owner: string | null;
      bounds: IBoundary;
    };

    type UMLElement = UMLModelElement & {
      type: UMLElementType;
    };

    type UMLRelationship = UMLModelElement & {
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

    type UMLClassifier = UMLElement & {
      attributes: string[];
      methods: string[];
    };

    type UMLAssociation = UMLRelationship & {
      source: UMLRelationship['source'] & {
        multiplicity: string;
        role: string;
      };
      target: UMLRelationship['target'] & {
        multiplicity: string;
        role: string;
      };
    };
  }
}
