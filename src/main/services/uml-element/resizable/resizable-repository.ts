import { AsyncAction } from '../../../utils/actions/actions';
import { ResizableActionTypes, ResizeEndAction, ResizeStartAction } from './resizable-types';
import { ResizeAction, ResizingActionTypes } from './resizing-types';

export const Resizable = {
  startResizing:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
      if (!ids.length) {
        return;
      }

      dispatch<ResizeStartAction>({
        type: ResizableActionTypes.START,
        payload: { ids },
        undoable: true,
      });
    },

  resize:
    (delta: { width: number; height: number }, id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().resizing;
      if (!ids.length) {
        return;
      }

      dispatch<ResizeAction>({
        type: ResizingActionTypes.RESIZE,
        payload: { ids, delta },
        undoable: false,
      });
    },

  endResizing:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().resizing;
      if (!ids.length) {
        return;
      }

      dispatch<ResizeEndAction>({
        type: ResizableActionTypes.END,
        payload: { ids },
        undoable: false,
      });
    },
};
