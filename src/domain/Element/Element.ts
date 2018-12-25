import uuid from './../utils/uuid';
import Boundary from './../geo/Boundary';

abstract class Element {
  readonly id: string = uuid();
  readonly kind: string = (<any>this).constructor.name;
  bounds: Boundary = new Boundary(0, 0, 200, 80);

  selected: boolean = false;

  owner: string | null = null;
  // ownedElements: Element[] = [];

  constructor(public name: string) {}
}

export default Element;
