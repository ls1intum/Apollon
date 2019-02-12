import { Reducer, AnyAction } from 'redux';
import { ActionTypes } from './types';
import { Actions } from './repository';
import Element, { ElementState, ElementRepository, ActionTypes as ElementActionTypes } from './../Element';
import Container from './Container';

const initialState: ElementState = {};

const ContainerReducer: Reducer<ElementState, AnyAction> = (
  state: ElementState = initialState,
  action: AnyAction
): ElementState => {
  let element: Element;
  let parent: Container;
  let children: Element[];
  let elements: Element[];
  let dict: ElementState;
  switch (action.type) {
    case ActionTypes.ADD_ELEMENT:
      parent = state[action.parent.id] as Container;
      children = parent.ownedElements.map(e => state[e]);
      elements = action.parent.addElement(action.child, children);
      dict = elements.reduce(
        (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
        {}
      );
      return {
        ...state,
        ...dict,
      };
    case ActionTypes.REMOVE_ELEMENT:
      parent = state[action.parent.id] as Container;
      children = parent.ownedElements.map(e => state[e]);
      elements = action.parent.removeElement(action.child, children);
      dict = elements.reduce(
        (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
        {}
      );
      return {
        ...state,
        ...dict,
      };
    case ElementActionTypes.RESIZE:
      element = ElementRepository.getById(state)(action.id);
      if (element instanceof Container) {
        children = element.ownedElements.map(e => state[e]);
        children = element.resizeElement(children);
        console.log(children);
        dict = children.reduce(
          (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
          {}
        );
        return {
          ...state,
          ...dict,
        };
      }
      return state;
  }
  return state;
};

export default ContainerReducer;
