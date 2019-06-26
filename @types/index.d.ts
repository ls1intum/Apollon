import { UMLElementType } from 'src/packages/uml-element-type';
import { IBoundary } from 'src/utils/geometry/boundary';

declare module '@ls1intum/apollon' {
  namespace Apollon {
    type UMLModel = {
      elements: UMLElement[];
    };

    type UMLElement = {
      id: string;
      name: string;
      type: UMLElementType;
      owner: string | null;
      bounds: IBoundary;
    };

    type UMLClassifier = Apollon.UMLElement & {
      attributes: string[];
      methods: string[];
    }
  }
}
