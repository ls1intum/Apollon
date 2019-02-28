import { Reducer } from 'redux';
import { State, ActionTypes, Actions } from './types';

const initialState: State = {};

const Reducer: Reducer<State, Actions> = (
  state: State = initialState,
  action: Actions
): State => {
  switch (action.type) {
    case ActionTypes.CREATE: {
      const { payload } = action;
      return { ...state, [payload.element.id]: { ...payload.element } };
    }
    case ActionTypes.HOVER: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], hovered: true },
      };
    }
    case ActionTypes.LEAVE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], hovered: false },
      };
    }
    case ActionTypes.SELECT: {
      const { payload } = action;
      if (!payload.id) return state;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          selected: !payload.toggle || !state[payload.id].selected,
        },
      };
    }
    case ActionTypes.DESELECT: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], selected: false },
      };
    }
    case ActionTypes.UPDATE: {
      // if (action.element.owner) {
      //   elements = { ...state, [action.element.id]: { ...action.element } };
      //   parent = ElementRepository.getById(elements)(
      //     action.element.owner
      //   ) as Container;
      //   children = parent.ownedElements.map(e => elements[e]);
      //   children = parent.resizeElement(children);
      //   elements = children.reduce(
      //     (o: { [id: string]: Element }, e: Element) => ({ ...o, [e.id]: e }),
      //     {}
      //   );
      // }
      const { payload } = action;
      return { ...state, [payload.element.id]: { ...payload.element } };
    }
    case ActionTypes.MOVE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          bounds: {
            ...state[payload.id].bounds,
            ...payload.position,
          },
        },
      };
    }
    case ActionTypes.RESIZE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          bounds: {
            ...state[payload.id].bounds,
            ...payload.size,
          },
        },
      };
    }
    case ActionTypes.DELETE: {
      const { payload } = action;
      const { [payload.id]: _, ...newState } = state;
      return newState;
    }
  }
  return state;
};

export default Reducer;
