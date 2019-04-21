import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { assign } from '../../utils/assign';
import { IUMLContainer, UMLContainer } from '../uml-container/uml-container';

export interface IUMLDiagram extends IUMLContainer {
  type: UMLDiagramType;
  ownedRelationships: string[];
}

export class UMLDiagram extends UMLContainer implements IUMLDiagram {
  type = UMLDiagramType.ClassDiagram;
  ownedRelationships: string[] = [];

  constructor(values?: DeepPartial<IUMLDiagram>) {
    super();
    assign<IUMLDiagram>(this, values);
  }
}
