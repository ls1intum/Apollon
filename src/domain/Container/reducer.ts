import { Reducer, AnyAction } from 'redux';
import { ActionTypes, Actions } from './types';
import Element, {
  ElementState as State,
  ElementRepository,
  ElementActionTypes,
} from './../Element';
import Container from './Container';

const initialState: State = {};

const Reducer: Reducer<State, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.APPEND_CHILD: {
      const { payload } = action;
      const container = state[payload.owner];
      if (!(container instanceof Container)) return state;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: [
            ...new Set([...container.ownedElements, payload.id].reverse()),
          ].reverse(),
        },
        [payload.id]: { ...state[payload.id], owner: payload.owner },
      };
    }
    case ActionTypes.REMOVE_CHILD: {
      const { payload } = action;
      const container = state[payload.owner];
      if (!(container instanceof Container)) return state;
      return {
        ...state,
        [payload.owner]: {
          ...container,
          ownedElements: container.ownedElements.filter(id => id != payload.id),
        },
        [payload.id]: { ...state[payload.id], owner: null },
      };
    }
  }
  return state;

  // let element: Element;
  // let parent: Container;
  // let children: Element[];
  // let elements: Element[];
  // let dict: State;
  // switch (action.type) {
  //   case ActionTypes.ADD_ELEMENT:
  //     parent = state[action.parent.id] as Container;
  //     children = parent.ownedElements.map(e => state[e]);
  //     elements = action.parent.addElement(action.child, children);
  //     dict = elements.reduce(
  //       (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
  //       {}
  //     );
  //     return {
  //       ...state,
  //       ...dict,
  //     };
  //   case ActionTypes.REMOVE_ELEMENT:
  // parent = state[action.parent.id] as Container;
  // children = parent.ownedElements.map(e => state[e]);
  // elements = action.parent.removeElement(action.child, children);
  // dict = elements.reduce(
  //   (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
  //   {}
  // );
  // return {
  //   ...state,
  //   ...dict,
  // };
  //     return state;
  //   case ElementActionTypes.RESIZE:
  //     element = ElementRepository.getById(state)(action.id);
  //     if (element instanceof Container) {
  //       children = element.ownedElements.map(e => state[e]);
  //       children = element.resizeElement(children);
  //       dict = children.reduce(
  //         (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
  //         {}
  //       );
  //       return {
  //         ...state,
  //         ...dict,
  //       };
  //     }
  //     return state;
  // }
  // return state;
};

export default Reducer;
