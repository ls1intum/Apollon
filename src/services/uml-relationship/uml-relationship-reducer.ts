import { Reducer } from 'redux';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLRelationship } from './uml-relationship';
import { UMLRelationshipActions, UMLRelationshipActionTypes } from './uml-relationship-types';

const initialState: UMLElementState = {};

export const UMLRelationshipReducer: Reducer<UMLElementState, UMLRelationshipActions> = (state = initialState, action) => {
  switch (action.type) {
    case UMLRelationshipActionTypes.CREATE: {
      const { payload } = action;
      return { ...state, [payload.relationship.id]: { ...payload.relationship } };
    }
    case UMLRelationshipActionTypes.REDRAW: {
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
    case UMLRelationshipActionTypes.CONNECT: {
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
    case UMLRelationshipActionTypes.FLIP: {
      const { payload } = action;
      const relationship = state[payload.id] as IUMLRelationship;
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
