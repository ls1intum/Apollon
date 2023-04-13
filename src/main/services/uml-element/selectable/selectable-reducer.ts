import { Reducer } from 'redux';
import { Actions } from '../../actions';
import { UMLElementActionTypes } from '../uml-element-types';
import { SelectableActionTypes, SelectableState } from './selectable-types';

export const SelectableReducer: Reducer<SelectableState, Actions> = (
  state = { ids: [], selectionBoxActive: false },
  action,
) => {
  switch (action.type) {
    case SelectableActionTypes.SELECT: {
      const { payload } = action;

      return { ids: [...new Set([...payload.ids, ...state.ids])], selectionBoxActive: false };
    }
    case UMLElementActionTypes.DELETE:
    case SelectableActionTypes.DESELECT: {
      const { payload } = action;

      return { ids: state.ids.filter((id) => !payload.ids.includes(id)), selectionBoxActive: false };
    }
    case SelectableActionTypes.START_SELECTION_BOX: {
      return { ids: state.ids, selectionBoxActive: true };
    }
    case SelectableActionTypes.END_SELECTION_BOX: {
      return { ids: state.ids, selectionBoxActive: false };
    }
  }

  return state;
};
