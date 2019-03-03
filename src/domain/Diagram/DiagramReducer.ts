import { Reducer, AnyAction } from 'redux';
import Diagram from './Diagram';
import { DiagramType, DiagramState } from './DiagramTypes';

const initialState: DiagramState = new Diagram(DiagramType.ActivityDiagram);

const ElementReducer: Reducer<DiagramState, AnyAction> = (
  state: DiagramState = initialState,
  action: AnyAction
): DiagramState => {
  switch (action.type) {
    case '@@diagram/CREATE':
      return {
        ...state,
        ownedElements: [...state.ownedElements, action.element.id],
      };
    case '@@diagram/DELETE':
      return {
        ...state,
        ownedElements: state.ownedElements.filter(id => id !== action.id),
        ownedRelationships: state.ownedRelationships.filter(
          id => id !== action.id
        ),
      };
    case '@@relationship/CREATE':
      return {
        ...state,
        ownedRelationships: [
          ...state.ownedRelationships,
          action.payload.relationship.id,
        ],
      };
    case '@@element/DELETE':
      return {
        ...state,
        ownedRelationships: state.ownedRelationships.filter(
          id => id !== action.id
        ),
      };
  }
  return state;
};

export default ElementReducer;
