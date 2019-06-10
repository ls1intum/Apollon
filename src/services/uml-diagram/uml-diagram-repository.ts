import { UMLDiagramType } from '../../packages/diagram-type';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLDiagram, UMLDiagram } from './uml-diagram';

export const UMLDiagramRepository = {
  isUMLDiagram: (element: IUMLElement): element is IUMLDiagram => element.type in UMLDiagramType,

  get: (element?: IUMLElement): UMLDiagram | null => {
    if (!element || !UMLDiagramRepository.isUMLDiagram(element)) {
      return null;
    }

    return new UMLDiagram(element);
  },
};
