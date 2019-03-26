import { Reducer } from 'redux';
import { ElementState, ElementActionTypes, ElementActions } from './element-types';

const initialState: ElementState = {};

export const ElementReducer: Reducer<ElementState, ElementActions> = (state = initialState, action) => {
  switch (action.type) {
    case ElementActionTypes.CREATE: {
      const { payload } = action;
      return { ...state, [payload.element.id]: { ...payload.element } };
    }
    case ElementActionTypes.HOVER: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], hovered: true },
      };
    }
    case ElementActionTypes.LEAVE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], hovered: false },
      };
    }
    case ElementActionTypes.SELECT: {
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
    case ElementActionTypes.RESIZE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          bounds: {
            ...state[payload.id].bounds,
            width: state[payload.id].bounds.width + payload.delta.width,
            height: state[payload.id].bounds.height + payload.delta.height,
          },
        },
      };
    }
    case ElementActionTypes.MOVE: {
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
    case ElementActionTypes.CHANGE: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], type: payload.kind },
      };
    }
    case ElementActionTypes.RENAME: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: { ...state[payload.id], name: payload.name },
      };
    }
    case ElementActionTypes.UPDATE: {
      const { payload } = action;
      return { ...state, [payload.id]: { ...state[payload.id], ...payload.values } };
    }
    case ElementActionTypes.DELETE: {
      const { payload } = action;
      if (!payload.id) return state;
      const { [payload.id]: _, ...newState } = state;
      return newState;
    }
  }
  return state;
};
