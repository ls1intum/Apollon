import { Apollon } from '@ls1intum/apollon';
import { DeepPartial } from 'redux';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { assign } from '../../utils/fx/assign';
import { IPoint } from '../../utils/geometry/point';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { Direction, IUMLElementPort } from '../uml-element/uml-element-port';
import { UMLRelationshipFeatures } from './uml-relationship-features';

export interface IUMLRelationship extends IUMLElement {
  type: UMLRelationshipType;
  path: IPoint[];
  source: IUMLElementPort;
  target: IUMLElementPort;
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
  source: IUMLElementPort = {
    direction: Direction.Up,
    element: '',
  };
  target: IUMLElementPort = {
    direction: Direction.Up,
    element: '',
  };

  constructor(values?: DeepPartial<IUMLRelationship>) {
    super();
    assign<IUMLRelationship>(this, values);
  }

  serialize(): Apollon.UMLRelationship {
    return {
      ...super.serialize(),
      type: this.type,
      path: this.path,
      source: this.source,
      target: this.target,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLRelationship => v.type in UMLRelationshipType;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values);
    this.type = values.type;
    this.path = values.path;
    this.source = values.source;
    this.target = values.target;
  }

  // TODO
  // abstract render(canvas: ILayer): ILayoutable[];
  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
