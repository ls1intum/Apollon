import { Reducer } from 'redux';
import { ElementState } from '../element/element-types';
import { IRelationship } from './relationship';
import { RelationshipActions, RelationshipActionTypes } from './relationship-types';

const initialState: ElementState = {};

export const RelationshipReducer: Reducer<ElementState, RelationshipActions> = (state = initialState, action) => {
  switch (action.type) {
    case RelationshipActionTypes.CREATE: {
      const { payload } = action;
      return { ...state, [payload.relationship.id]: { ...payload.relationship } };
    }
    case RelationshipActionTypes.REDRAW: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          path: payload.path,
          bounds: payload.bounds,
        },
      };
    }
    case RelationshipActionTypes.CONNECT: {
      const { payload } = action;
      return {
        ...state,
        [payload.id]: {
          ...state[payload.id],
          ...(payload.source && { source: payload.source }),
          ...(payload.target && { target: payload.target }),
        },
      };
    }
    case RelationshipActionTypes.FLIP: {
      const { payload } = action;
      const relationship = state[payload.id] as IRelationship;
      [relationship.source, relationship.target] = [relationship.target, relationship.source];
      return {
        ...state,
        [payload.id]: {
          ...relationship,
        },
      };
    }
    default:
      return state;
  }
};
