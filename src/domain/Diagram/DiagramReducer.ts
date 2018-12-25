import { Reducer } from 'redux';
import Diagram from './Diagram';
import { DiagramState } from './DiagramTypes';
import { Actions, ActionTypes } from './../Element';
import { CreateRelationshipAction } from './../Relationship/actions'

const initialState: DiagramState = new Diagram();

const ElementReducer: Reducer<DiagramState, Actions | CreateRelationshipAction> = (
  state: DiagramState = initialState,
  action: Actions | CreateRelationshipAction
): DiagramState => {
  switch (action.type) {
    case ActionTypes.CREATE:
      if (action.element.owner) break;
      return {
        ...state,
        ownedElements: [...state.ownedElements, action.element.id],
      };
    case "CREATE_RELATIONSHIP":
      return {
        ...state,
        ownedRelationships: [...state.ownedRelationships, action.relationship.id],
      };
      break;
  }
  return state;
};

export default ElementReducer;
