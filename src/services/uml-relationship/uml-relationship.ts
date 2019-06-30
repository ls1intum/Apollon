import { Apollon } from '@ls1intum/apollon';
import { DeepPartial } from 'redux';
import { IBoundary } from 'src/utils/geometry/boundary';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { assign } from '../../utils/fx/assign';
import { IPath } from '../../utils/geometry/path';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { Direction, IUMLElementPort } from '../uml-element/uml-element-port';
import { Connection } from './connection';
import { UMLRelationshipFeatures } from './uml-relationship-features';

export interface IUMLRelationship extends IUMLElement {
  type: UMLRelationshipType;
  path: IPath;
  source: IUMLElementPort;
  target: IUMLElementPort;
}

export abstract class UMLRelationship extends UMLElement implements IUMLRelationship {
  static features: UMLRelationshipFeatures = {
    connectable: false,
    droppable: false,
    hoverable: true,
    movable: false,
    reconnectable: true,
    resizable: false,
    selectable: true,
    updatable: true,
    straight: false,
    variable: true,
  };

  abstract type: UMLRelationshipType;
  path: IPath = [{ x: 0, y: 0 }, { x: 200, y: 100 }];
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

  render(canvas: ILayer, source?: IBoundary, target?: IBoundary): ILayoutable[] {
    if (!source || !target) {
      return [this];
    }

    const { straight, variable } = (this.constructor as typeof UMLRelationship).features;
    const path = Connection.computePath(
      { bounds: source, direction: this.source.direction },
      { bounds: target, direction: this.target.direction },
      { isStraight: straight, isVariable: variable },
    );

    const x = Math.min(...path.map(point => point.x));
    const y = Math.min(...path.map(point => point.y));
    const width = Math.max(Math.max(...path.map(point => point.x)) - x, 1);
    const height = Math.max(Math.max(...path.map(point => point.y)) - y, 1);
    this.bounds = { x, y, width, height };
    this.path = path.map(point => ({ x: point.x - x, y: point.y - y })) as IPath;
    return [this];
  }
}
