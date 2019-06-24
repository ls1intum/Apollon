import { Reducer } from 'redux';
import { UMLContainerActions, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { ResizingActions, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { CreateAction, UMLElementActionTypes } from '../uml-element/uml-element-types';
import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
import { UMLDiagram } from './uml-diagram';
import { UMLDiagramState } from './uml-diagram-types';

export const UMLDiagramReducer: Reducer<UMLDiagramState, UMLContainerActions | CreateAction | ResizingActions> = (
  state = new UMLDiagram(),
  action,
) => {
  switch (action.type) {
    case UMLElementActionTypes.CREATE: {
      const { payload } = action;

      payload.values.filter(value => UMLRelationshipRepository.isUMLRelationship(value));

      return state;
    }
    case UMLContainerActionTypes.APPEND: {
      const { payload } = action;
      if (state.id !== payload.owner) {
        return {
          ...state,
          ownedElements: state.ownedElements.filter(id => !payload.ids.includes(id)),
        };
      }

      return {
        ...state,
        ownedElements: [...new Set([...state.ownedElements, ...payload.ids])],
      };
    }
    case UMLContainerActionTypes.REMOVE: {
      const { payload } = action;

      return {
        ...state,
        ownedElements: state.ownedElements.filter(id => !payload.ids.includes(id)),
        ownedRelationships: state.ownedElements.filter(id => !payload.ids.includes(id)),
      };
    }
    case ResizingActionTypes.RESIZE: {
      const { payload } = action;
      if (!payload.ids.includes(state.id)) {
        break;
      }

      return {
        ...state,
        bounds: {
          ...state.bounds,
          width: state.bounds.width + payload.delta.width,
          height: state.bounds.height + payload.delta.height,
        },
      };
    }
  }

  return state;
};
