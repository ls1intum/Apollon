import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { RelationshipType as UMLRelationshipType } from '../../packages/relationship-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { assign } from '../../utils/fx/assign';
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
  bounds: { x: number; y: number; width: number; height: number };
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

  /** Serializes an `UMLElement` to an `IUMLElement` */
  serialize<T extends IUMLElement>(): T {
    const json = { ...(this as UMLElement) };

    return json as T;
  }

  abstract render(canvas: ILayer): ILayoutable[];
}
