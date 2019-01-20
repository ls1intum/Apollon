import uuid from './../utils/uuid';
import Boundary from './../geo/Boundary';

abstract class Element {
  static isHoverable = true;
  static isSelectable = true;
  static isMovable = true;
  static isResizable = true;
  static isConnectable = true;
  static isDroppable = false;
  static isEditable = true;

  readonly id: string = uuid();
  readonly kind: string = (<any>this).constructor.name;
  bounds: Boundary = new Boundary(0, 0, 200, 100);

  selected: boolean = false;

  owner: string | null = null;

  constructor(public name: string) {}
}

export default Element;
