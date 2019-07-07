import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { assign } from '../../utils/fx/assign';
import { IBoundary } from '../../utils/geometry/boundary';
import { uuid } from '../../utils/uuid';
import { ILayer } from '../layouter/layer';
import { ILayoutable } from '../layouter/layoutable';
import { UMLElementFeatures } from './uml-element-features';

/** Interface of a `UMLElement` defining the properties persisted in the internal storage */
export interface IUMLElement {
  /** Unique Identifier of the `UMLElement` */
  id: string;
  /** Visual name of the `UMLElement` */
  name: string;
  /** Distinct type to recreate the `UMLElement` */
  type: UMLElementType | UMLRelationshipType | UMLDiagramType;
  /** Optional owner of the `UMLElement` */
  owner: string | null;
  /** Position and sizing of the `UMLElement` */
  bounds: IBoundary;
}

/** Class implementation of `IUMLElement` to use inheritance at runtime */
export abstract class UMLElement implements IUMLElement, ILayoutable {
  /** `UMLElement` type specific feature flags */
  static features: UMLElementFeatures = {
    connectable: true,
    droppable: false,
    hoverable: true,
    movable: true,
    resizable: true,
    selectable: true,
    updatable: true,
  };

  /** Checks whether an `IUMLElement` is of type `UMLElementType` */
  static isUMLElement = (element: IUMLElement): element is IUMLElement & { type: UMLElementType } =>
    element.type in UMLElementType;

  id = uuid();
  name = '';
  abstract type: UMLElementType | UMLRelationshipType | UMLDiagramType;
  bounds = { x: 0, y: 0, width: 200, height: 100 };
  owner = null as string | null;

  constructor(values?: DeepPartial<IUMLElement>) {
    assign<IUMLElement>(this, values);
  }

  /**
   * Clones an instance of `UMLElement`
   *
   * @param override - Override existing properties.
   */
  clone<T extends UMLElement>(override?: DeepPartial<IUMLElement>): T {
    const Constructor = this.constructor as new (values?: DeepPartial<IUMLElement>) => T;
    // TODO: deep merge
    const values: IUMLElement = { ...this, ...override, id: uuid() };

    return new Constructor(values);
  }

  /** Serializes an `UMLElement` to an `Apollon.UMLElement` */
  serialize(children?: UMLElement[]): Apollon.UMLModelElement {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      owner: this.owner,
      bounds: this.bounds,
    };
  }

  /** Deserializes an `Apollon.UMLElement` to an `UMLElement` */
  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    this.id = values.id;
    this.name = values.name;
    this.type = values.type;
    this.owner = values.owner || null;
    this.bounds = { ...values.bounds };
  }

  abstract render(canvas: ILayer): ILayoutable[];
}
