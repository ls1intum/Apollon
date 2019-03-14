import uuid from './../utils/uuid';
import Boundary from './../geo/Boundary';

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
  abstract readonly kind: string;
  bounds: Boundary = new Boundary(0, 0, 200, 100);

  hovered: boolean = false;
  selected: boolean = false;
  interactive: boolean = false;

  owner: string | null = null;

  constructor(public name: string) {}
}

export default Element;
