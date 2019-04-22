import { Constructor } from 'react-native';
import { AsyncAction } from '../../../utils/actions/actions';
import { ResizableActionTypes, ResizeEndAction, ResizeStartAction } from './resizable-types';
import { ResizeAction, ResizingActionTypes } from './resizing-types';

export function Resizable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static startResizing = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
      if (!ids.length) {
        return;
      }

      dispatch<ResizeStartAction>({
        type: ResizableActionTypes.RESIZE_START,
        payload: { ids },
      });
    };

    static resize = (delta: { width: number; height: number }, id?: string | string[]): AsyncAction => (
      dispatch,
      getState,
    ) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().resizing;
      if (!ids.length) {
        return;
      }

      dispatch<ResizeAction>({
        type: ResizingActionTypes.RESIZE,
        payload: { ids, delta },
      });
    };

    static endResizing = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().resizing;
      if (!ids.length) {
        return;
      }

      dispatch<ResizeEndAction>({
        type: ResizableActionTypes.RESIZE_END,
        payload: { ids },
      });
    };
  };
}
