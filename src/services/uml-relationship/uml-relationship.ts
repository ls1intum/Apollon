import { DeepPartial } from 'redux';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { assign } from '../../utils/fx/assign';
import { IPoint } from '../../utils/geometry/point';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { IUMLElementPort } from '../uml-element/uml-element-port';
import { UMLRelationshipFeatures } from './uml-relationship-features';

export interface IUMLRelationship extends IUMLElement {
  type: UMLRelationshipType;
  path: IPoint[];
  source: IUMLElementPort | null;
  target: IUMLElementPort | null;
}

export abstract class UMLRelationship extends UMLElement implements IUMLRelationship {
  static features: UMLRelationshipFeatures = {
    connectable: false,
    droppable: false,
    hoverable: false,
    movable: false,
    resizable: false,
    selectable: false,
    updatable: false,
    straight: false,
  };

  abstract type: UMLRelationshipType;
  path: IPoint[] = [];
  source: IUMLElementPort | null = null;
  target: IUMLElementPort | null = null;

  constructor(values?: DeepPartial<IUMLRelationship>) {
    super();
    assign<IUMLRelationship>(this, values);
  }

  // abstract render(canvas: ILayer): ILayoutable[];
  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
