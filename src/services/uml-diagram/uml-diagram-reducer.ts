import { Reducer } from 'redux';
import { UMLContainerActions, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { ResizingActions, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { UMLDiagram } from './uml-diagram';
import { UMLDiagramActions, UMLDiagramActionTypes, UMLDiagramState } from './uml-diagram-types';

export const UMLDiagramReducer: Reducer<UMLDiagramState, UMLDiagramActions | UMLContainerActions | ResizingActions> = (
  state = new UMLDiagram(),
  action,
) => {
  switch (action.type) {
    case UMLDiagramActionTypes.APPEND: {
      const { payload } = action;

      return {
        ...state,
        ownedRelationships: [...new Set([...state.ownedRelationships, ...payload.ids])],
      };
    }
    case UMLDiagramActionTypes.REMOVE: {
      const { payload } = action;

      return {
        ...state,
        ownedRelationships: state.ownedRelationships.filter(id => !payload.ids.includes(id)),
      };
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
