import { AsyncAction } from '../../../utils/actions/actions';
import { DeselectAction, SelectableActionTypes, SelectAction } from './selectable-types';
import { SetSelectionBoxAction, EditorActionTypes } from '../../editor/editor-types';

export const Selectable = {
  select:
    (id?: string | string[], overwrite?: boolean): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : Object.keys(getState().elements);
      if (!ids.length) {
        dispatch<SetSelectionBoxAction>({
          type: EditorActionTypes.SET_SELECTION_BOX,
          payload: {
            selectionBoxActive: false,
          },
          undoable: false,
        });
      }

      return dispatch<SelectAction>({
        type: SelectableActionTypes.SELECT,
        payload: {
          ids: ids,
          overwrite: overwrite,
        },
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
        payload: { ids: ids },
        undoable: false,
      });
    },
};
