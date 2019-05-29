import { Reducer } from 'redux';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { ResizeAction, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { UMLDiagram } from './uml-diagram';
import { UMLDiagramState } from './uml-diagram-types';

const initialState: UMLDiagramState = new UMLDiagram();

export const UMLDiagramReducer: Reducer<UMLDiagramState, AppendAction | RemoveAction | ResizeAction> = (
  state = initialState,
  action,
) => {
  switch (action.type) {
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
        ownedElements: [...new Set([...payload.ids, ...state.ownedElements])],
      };
    }
    case UMLContainerActionTypes.REMOVE: {
      const { payload } = action;

      return {
        ...state,
        ownedElements: state.ownedElements.filter(id => !payload.ids.includes(id)),
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
