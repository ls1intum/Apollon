import { AsyncAction } from '../../../utils/actions/actions';
import { ResizeFrom } from '../uml-element';
import { ResizableActionTypes, ResizeEndAction, ResizeStartAction } from './resizable-types';
import { ResizeAction, ResizingActionTypes } from './resizing-types';

export const Resizable = {
  startResizing:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : [];
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
    (delta: { width: number; height: number }, resizeFrom: ResizeFrom, id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : [];
      if (!ids.length) {
        return;
      }

      dispatch<ResizeAction>({
        type: ResizingActionTypes.RESIZE,
        payload: { ids, delta, resizeFrom },
        undoable: false,
      });
    },

  endResizing:
    (id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : [];
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
