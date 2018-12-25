import Element from './Element';

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
export { ActionTypes, ElementState } from './types';
export { default as ElementRepository, Actions } from './repository';
export { default as ElementReducer } from './reducer';
