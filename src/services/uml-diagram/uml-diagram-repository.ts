import { UMLDiagramType } from '../../packages/diagram-type';
import { IUMLElement } from '../uml-element/uml-element';
import { UMLDiagram } from './uml-diagram';

export class UMLDiagramRepository {
  static isUMLDiagram(element: IUMLElement): element is IUMLElement & { type: UMLDiagramType } {
    return element.type in UMLDiagramType;
  }

  static read = (diagram: IUMLElement): UMLDiagram | null => {
    if (!UMLDiagramRepository.isUMLDiagram(diagram)) {
      return null;
    }

    return new UMLDiagram(diagram);
  };
}
