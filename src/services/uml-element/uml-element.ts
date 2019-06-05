import { DeepPartial } from 'redux';
import { UMLDiagramType } from '../../packages/diagram-type';
import { RelationshipType as UMLRelationshipType } from '../../packages/relationship-type';
import { UMLElementType } from '../../packages/uml-element-type';
import { assign } from '../../utils/assign';
import { Boundary } from '../../utils/geometry/boundary';
import { uuid } from '../../utils/uuid';

export interface IUMLElement {
  id: string;
  name: string;
  type: UMLElementType | UMLRelationshipType | UMLDiagramType;
  owner: string | null;
  highlight?: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export abstract class UMLElement implements IUMLElement {
  static features = {
    hoverable: true,
    selectable: true,
    movable: true,
    resizable: 'BOTH' as 'BOTH' | 'WIDTH' | 'HEIGHT' | 'NONE',
    connectable: true,
    editable: true,
    interactable: true,
    droppable: false,
  };

  readonly id: string = uuid();
  name: string = '';
  highlight?: string;
  abstract readonly type: UMLElementType | UMLRelationshipType | UMLDiagramType;
  readonly bounds: Boundary = { x: 0, y: 0, width: 200, height: 100 };
  owner: string | null = null;

  constructor(values?: DeepPartial<IUMLElement>) {
    assign<IUMLElement>(this, values);
  }

  clone<T extends UMLElement>(override?: DeepPartial<IUMLElement>): T {
    const Constructor = (this.constructor as any) as new (values: IUMLElement) => T;
    const values: IUMLElement = { ...this, id: uuid(), ...override };
    return new Constructor(values);
  }

  serialize<T extends IUMLElement>(): T {
    const keys = Object.getOwnPropertyNames(this) as Array<keyof T>;
    return keys.reduce<T>((object, key) => ({
      ...object,
      // TODO: Fix Typings
      [key]: (this as any as T)[key],
    }), {} as T);
  }

  toUMLElement(element: UMLElement, children: UMLElement[]): { element: IUMLElement; children: UMLElement[] } {
    return {
      element: {
        id: element.id,
        name: element.name,
        owner: element.owner,
        highlight: element.highlight,
        type: element.type as UMLElementType,
        bounds: element.bounds,
      },
      children,
    };
  }
}
