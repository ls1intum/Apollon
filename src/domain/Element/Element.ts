import uuid from './../utils/uuid';
import Boundary from './../geo/Boundary';
import ElementKind from './../plugins/ElementKind';
import { RelationshipKind } from '../Relationship';
import { UMLElement } from '../../ApollonEditor';

abstract class Element {
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
  readonly base: string = 'Element';
  abstract readonly kind: ElementKind | RelationshipKind;
  bounds: Boundary = new Boundary(0, 0, 200, 100);

  hovered: boolean = false;
  selected: boolean = false;
  interactive: boolean = false;

  owner: string | null = null;

  constructor(public name: string) {}

  static toUMLElement(
    element: Element,
    children: Element[]
  ): { element: UMLElement; children: Element[] } {
    return {
      element: {
        id: element.id,
        name: element.name,
        owner: element.owner,
        type: element.kind as ElementKind,
        bounds: element.bounds,
      },
      children: children,
    };
  }

  static fromUMLElement<T extends typeof Element>(
    umlElement: UMLElement,
    Clazz: T
  ): Element[] {
    return [
      Object.setPrototypeOf(
        {
          id: umlElement.id,
          name: umlElement.name,
          owner: umlElement.owner,
          kind: umlElement.type,
          bounds: umlElement.bounds,
          base: 'Element',
          hovered: false,
          selected: false,
        },
        Clazz.prototype
      ),
    ];
  }
}

export default Element;
