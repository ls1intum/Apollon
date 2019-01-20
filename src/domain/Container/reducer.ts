import { Reducer, AnyAction } from 'redux';
import { ActionTypes } from './types';
import { Actions } from './repository';
import { ElementState } from './../Element';
import Container from './Container';

const initialState: ElementState = {};

const ContainerReducer: Reducer<ElementState, AnyAction> = (
  state: ElementState = initialState,
  action: AnyAction
): ElementState => {
  switch (action.type) {
    case ActionTypes.ADD_ELEMENT:
      const parent = state[action.parent.id] as Container;
      const children = parent.ownedElements.map(e => state[e]);
      const elements = action.parent.addElement(action.child, children);
      const dict = elements.reduce(
        (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
        {}
      );
      return {
        ...state,
        ...dict,
      };
  }
  return state;
};

export default ContainerReducer;
