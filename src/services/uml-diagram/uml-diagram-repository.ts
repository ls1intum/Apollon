import { UMLDiagramType } from '../../packages/diagram-type';
import { IUMLContainer } from '../uml-container/uml-container';
import { IUMLElement } from '../uml-element/uml-element';
import { UMLDiagram } from './uml-diagram';

export class UMLDiagramRepository {
  static isUMLDiagram(element: IUMLElement): element is IUMLContainer & { type: UMLDiagramType } {
    return element.type in UMLDiagramType;
  }

  static get = (element?: IUMLElement): UMLDiagram | null => {
    if (!element || !UMLDiagramRepository.isUMLDiagram(element)) {
      return null;
    }

    return new UMLDiagram(element);
  };
}
