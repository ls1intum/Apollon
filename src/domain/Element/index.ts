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

  owner: Element | null = null;
  ownedElements: Element[] = [];

  constructor(public name: string) {}
}

export const enum EntityKind {
    AbstractClass = "AbstractClass",
    Class = "Class",
    Enumeration = "Enumeration",
    Interface = "Interface",
    InitialNode = "InitialNode",
    FinalNode = "FinalNode",
    ActionNode = "ActionNode",
    ObjectNode = "ObjectNode",
    MergeNode = "MergeNode",
    ForkNode = "ForkNode",
}

export default Element;
export { ElementState } from './types';
export { default as ElementRepository, Actions } from './repository';
export { default as ElementReducer } from './reducer';
