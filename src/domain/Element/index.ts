import uuid from './../utils/uuid';

interface Element {
  readonly id: string;
  readonly futureKind: string;
}

abstract class Element {
  readonly id: string = uuid();
  readonly futureKind: string = (<any>this).constructor.name;

  selected: boolean = false;
}

export default Element;
export { ElementState } from './types';
export { default as ElementRepository, Actions } from './repository';
export { default as ElementReducer } from './reducer';
