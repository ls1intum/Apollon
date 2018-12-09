import uuid from './../utils/uuid';

interface Element {
  id: string;
}

abstract class Element {
  public id: string;

  constructor() {
    this.id = uuid();
  }
}

export default Element;
export { ElementState } from './types';
export { default as ElementRepository, Actions } from './repository';
export { default as ElementReducer } from './reducer';
