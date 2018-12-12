import uuid from './../utils/uuid';
import Boundary from './../geo/Boundary';

interface Element {
  readonly id: string;
  readonly kind: string;
}

abstract class Element {
  readonly id: string = uuid();
  readonly kind: string = (<any>this).constructor.name;
  bounds: Boundary = new Boundary(0, 0, 200, 80);

  selected: boolean = false;

  constructor(public name: string) {}

  public abstract render?(options: any): JSX.Element;
}

export default Element;
export { ElementState } from './types';
export { default as ElementRepository, Actions } from './repository';
export { default as ElementReducer } from './reducer';
