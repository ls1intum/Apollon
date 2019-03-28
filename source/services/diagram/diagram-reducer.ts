import { Reducer } from 'redux';
import { Diagram } from './diagram';
import { DiagramState, DiagramActions, DiagramActionTypes } from './diagram-types';

const initialState: DiagramState = new Diagram();

export const DiagramReducer: Reducer<DiagramState, DiagramActions> = (state = initialState, action) => {
  switch (action.type) {
    case DiagramActionTypes.ADD_ELEMENT: {
      const { payload } = action;
      return {
        ...state,
        ownedElements: [...new Set([...state.ownedElements, payload.id].reverse())].reverse(),
      };
    }
    case DiagramActionTypes.ADD_RELATIONSHIP: {
      const { payload } = action;
      return {
        ...state,
        ownedRelationships: [...new Set([...state.ownedRelationships, payload.id].reverse())].reverse(),
      };
    }
    case DiagramActionTypes.DELETE_ELEMENT: {
      const { payload } = action;
      return {
        ...state,
        ownedElements: state.ownedElements.filter(id => id !== payload.id),
      };
    }
    case DiagramActionTypes.DELETE_RELATIONSHIP: {
      const { payload } = action;
      return {
        ...state,
        ownedRelationships: state.ownedRelationships.filter(id => id !== payload.id),
      };
    }
  }
  return state;
};
