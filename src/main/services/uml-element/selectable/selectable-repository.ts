import { AsyncAction } from '../../../utils/actions/actions';
import { DeselectAction, SelectableActionTypes, SelectAction } from './selectable-types';

export const Selectable = {
  select:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : Object.keys(getState().elements);
      if (!ids.length) {
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
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
      if (!ids.length) {
        return;
      }

      return dispatch<DeselectAction>({
        type: SelectableActionTypes.DESELECT,
        payload: { ids },
        undoable: false,
      });
    },
};
