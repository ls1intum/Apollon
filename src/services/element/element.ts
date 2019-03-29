import { ElementType } from '../../packages/element-type';
import { RelationshipType } from '../../packages/relationship-type';
import { UMLElement } from '../../typings';
import { Boundary } from '../../utils/geometry/boundary';
import { uuid } from '../../utils/uuid';

export interface IElement {
  readonly id: string;
  readonly name: string;
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
  abstract readonly type: ElementType | RelationshipType;
  readonly bounds: Boundary = new Boundary(0, 0, 200, 100);
  owner: string | null = null;

  hovered: boolean = false;
  selected: boolean = false;
  interactive: boolean = false;

  constructor(values?: IElement);
  constructor(values?: UMLElement);
  constructor(values?: IElement | UMLElement);
  constructor(values?: IElement | UMLElement) {
    Object.assign(this, values);
  }

  toUMLElement(element: Element, children: Element[]): { element: UMLElement; children: Element[] } {
    return {
      element: {
        id: element.id,
        name: element.name,
        owner: element.owner,
        type: element.type as ElementType,
        bounds: element.bounds,
      },
      children,
    };
  }
}
