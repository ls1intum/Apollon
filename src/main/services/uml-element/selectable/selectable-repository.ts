import { AsyncAction } from '../../../utils/actions/actions';
import {
  DeselectAction,
  SelectableActionTypes,
  SelectAction,
  StartSelectionBox,
  EndSelectionBox,
} from './selectable-types';

export const Selectable = {
  select:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : Object.keys(getState().elements);
      if (!ids.length) {
        dispatch<EndSelectionBox>({
          type: SelectableActionTypes.END_SELECTION_BOX,
          payload: {},
          undoable: false,
        });
        return;
      }

      return dispatch<SelectAction>({
        type: SelectableActionTypes.SELECT,
        payload: { ids },
        undoable: false,
      });
    },

  deselect:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected.ids;
      if (!ids.length) {
        return;
      }

      return dispatch<DeselectAction>({
        type: SelectableActionTypes.DESELECT,
        payload: { ids },
        undoable: false,
      });
    },

  startSelectionBox: (): AsyncAction => (dispatch, getState) => {
    const ids = getState().selected.ids;

    return dispatch<StartSelectionBox>({
      type: SelectableActionTypes.START_SELECTION_BOX,
      payload: { ids },
      undoable: false,
    });
  },
};
