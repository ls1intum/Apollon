import { ElementType } from '../../packages/element-type';
import { RelationshipType } from '../../packages/relationship-type';
import { UMLElement } from '../../typings';
import { Boundary } from '../../utils/geometry/boundary';
import { uuid } from '../../utils/uuid';
import { ColorPropType } from 'react-native';

export interface IElement {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly type: ElementType | RelationshipType;
  readonly bounds: Boundary;
  readonly owner: string | null;

  hovered: boolean;
  selected: boolean;
  interactive: boolean;
}

export abstract class Element implements IElement {
  static features = {
    hoverable: true,
    selectable: true,
    movable: true,
    resizable: 'BOTH' as 'BOTH' | 'WIDTH' | 'HEIGHT' | 'NONE',
    connectable: true,
    editable: true,
    interactable: true,
  };

  readonly id: string = uuid();
  name: string = '';
  color: string = 'white';
  abstract readonly type: ElementType | RelationshipType;
  readonly bounds: Boundary = { x: 0, y: 0, width: 200, height: 100 };
  owner: string | null = null;

  hovered: boolean = false;
  selected: boolean = false;
  interactive: boolean = false;

  constructor(values?: IElement);
  constructor(values?: UMLElement);
  constructor(values?: IElement | UMLElement);
  constructor(values?: IElement | UMLElement) {
    if (values) {
      Object.assign(this, { ...values, bounds: { ...values.bounds } });
    }
  }

  copy<T extends Element>(): T {
    const Constructor = (this.constructor as any) as new (values: IElement) => T;
    const copy = new Constructor(this);
    return copy;
  }

  toUMLElement(element: Element, children: Element[]): { element: UMLElement; children: Element[] } {
    return {
      element: {
        id: element.id,
        name: element.name,
        owner: element.owner,
        color: element.color === 'white' ? undefined : element.color,
        type: element.type as ElementType,
        bounds: element.bounds,
      },
      children,
    };
  }
}
