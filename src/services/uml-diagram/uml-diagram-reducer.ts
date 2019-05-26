import { Reducer } from 'redux';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { ResizeAction, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { UMLDiagram } from './uml-diagram';
import { UMLDiagramActions, UMLDiagramState } from './uml-diagram-types';

const initialState: UMLDiagramState = new UMLDiagram();

export const UMLDiagramReducer: Reducer<
  UMLDiagramState,
  UMLDiagramActions & AppendAction & RemoveAction & ResizeAction
> = (state = initialState, action) => {
  switch (action.type) {
    case UMLContainerActionTypes.APPEND: {
      const { payload } = action as AppendAction;
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
      const { payload } = action as RemoveAction;

      return payload.ids.reduce<UMLDiagramState>((newState, id) => {
        console.log(id);
        return newState;
      }, state);
      // if (state.id !== payload.owner) {
      //   break;
      // }

      // return {
      //   ...state,
      //   ownedElements: state.ownedElements.filter(id => !payload.ids.includes(id)),
      // };
    }
    case ResizingActionTypes.RESIZE: {
      const { payload } = action as ResizeAction;
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
