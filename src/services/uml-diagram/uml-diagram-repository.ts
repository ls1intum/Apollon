import { UMLDiagramType } from '../../packages/diagram-type';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLDiagram, UMLDiagram } from './uml-diagram';

export class UMLDiagramRepository {
  static isUMLDiagram(element: IUMLElement): element is IUMLDiagram {
    return element.type in UMLDiagramType;
  }

  static get = (element?: IUMLElement): UMLDiagram | null => {
    if (!element || !UMLDiagramRepository.isUMLDiagram(element)) {
      return null;
    }

    return new UMLDiagram(element);
  };
}
