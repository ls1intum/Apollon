import { DeepPartial } from 'redux';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import * as Apollon from '../../typings';
import { assign } from '../../utils/fx/assign';
import { IPath } from '../../utils/geometry/path';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { IUMLElement, UMLElement } from '../uml-element/uml-element';
import { Direction, IUMLElementPort } from '../uml-element/uml-element-port';
import { Connection } from './connection';
import { UMLRelationshipFeatures } from './uml-relationship-features';
import { uuid } from '../../utils/uuid';

export interface IUMLRelationship extends IUMLElement {
  type: UMLRelationshipType;
  path: IPath;
  source: IUMLElementPort;
  target: IUMLElementPort;
  isManuallyLayouted?: boolean;
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
    alternativePortVisualization: false,
  };

  static isUMLRelationship = (element: IUMLElement): element is IUMLRelationship => {
    return element.type in UMLRelationshipType;
  };

  abstract type: UMLRelationshipType;
  path: IPath = [
    { x: 0, y: 0 },
    { x: 200, y: 100 },
  ];
  source: IUMLElementPort = {
    direction: Direction.Up,
    element: '',
  };
  target: IUMLElementPort = {
    direction: Direction.Up,
    element: '',
  };
  isManuallyLayouted?: boolean;

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
      isManuallyLayouted: this.isManuallyLayouted,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLRelationship => v.type in UMLRelationshipType;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values);
    this.type = values.type;
    this.path = values.path;
    this.source = values.source;
    this.target = values.target;
    this.isManuallyLayouted = values.isManuallyLayouted;
  }

  render(canvas: ILayer, source?: UMLElement, target?: UMLElement): ILayoutable[] {
    if (!source || !target) {
      return [this];
    }

    const { straight, variable } = (this.constructor as typeof UMLRelationship).features;
    const path = Connection.computePath(
      { element: source, direction: this.source.direction },
      { element: target, direction: this.target.direction },
      { isStraight: straight, isVariable: variable },
    );

    const x = Math.min(...path.map((point) => point.x));
    const y = Math.min(...path.map((point) => point.y));
    const width = Math.max(Math.max(...path.map((point) => point.x)) - x, 1);
    const height = Math.max(Math.max(...path.map((point) => point.y)) - y, 1);
    this.bounds = { x, y, width, height };
    this.path = path.map((point) => ({ x: point.x - x, y: point.y - y })) as IPath;
    return [this];
  }

  /**
   * Clones an instance of `UMLRelationship`
   *
   * @param override - Override existing properties.
   */
  cloneRelationship<T extends UMLRelationship>(override?: DeepPartial<IUMLRelationship>): T {
    const Constructor = this.constructor as new (values?: DeepPartial<IUMLRelationship>) => T;
    const values: IUMLRelationship = { ...this, ...override, id: uuid() };

    return new Constructor(values);
  }
}
