import { Reducer } from 'redux';
import Diagram from './Diagram';
import { State, Actions, ActionTypes } from './types';
import DiagramType from '../plugins/DiagramType';

const initialState: State = new Diagram(DiagramType.ClassDiagram);

const Reducer: Reducer<State, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.ADD_ELEMENT: {
      const { payload } = action;
      return {
        ...state,
        ownedElements: [
          ...new Set([...state.ownedElements, payload.id].reverse()),
        ].reverse(),
      };
    }
    case ActionTypes.ADD_RELATIONSHIP: {
      const { payload } = action;
      return {
        ...state,
        ownedRelationships: [
          ...new Set([...state.ownedRelationships, payload.id].reverse()),
        ].reverse(),
      };
    }
    case ActionTypes.DELETE_ELEMENT: {
      const { payload } = action;
      return {
        ...state,
        ownedElements: state.ownedElements.filter(id => id !== payload.id),
      };
    }
    case ActionTypes.DELETE_RELATIONSHIP: {
      const { payload } = action;
      return {
        ...state,
        ownedRelationships: state.ownedRelationships.filter(
          id => id !== payload.id
        ),
      };
    }
  }
  return state;
};

export default Reducer;
