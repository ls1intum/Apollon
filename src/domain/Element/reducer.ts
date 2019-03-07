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
    case ActionTypes.MOVE: {
      const { payload } = action;
      if (!payload.id) return state;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          bounds: {
            ...state[payload.id].bounds,
            x: state[payload.id].bounds.x + payload.delta.x,
            y: state[payload.id].bounds.y + payload.delta.y,
          },
        },
      };
    }
    case ActionTypes.UPDATE: {
      const { payload } = action;
      return { ...state, [payload.element.id]: { ...payload.element } };
    }
    case ActionTypes.DELETE: {
      const { payload } = action;
      if (!payload.id) return state;
      const { [payload.id]: _, ...newState } = state;
      return newState;
    }
  }
  return state;
};

export default Reducer;
