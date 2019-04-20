import { Constructor } from 'react-native';
import { ResizableActionTypes, ResizeAction, ResizeEndAction, ResizeStartAction } from './resizable-types';

export function Resizable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static resizeStart = (id: string | string[]): ResizeStartAction => ({
      type: ResizableActionTypes.RESIZE_START,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });

    static resize = (id: string | string[], delta: { width: number; height: number }): ResizeAction => ({
      type: ResizableActionTypes.RESIZE,
      payload: { ids: Array.isArray(id) ? id : [id], delta },
    });

    static resizeEnd = (id: string | string[]): ResizeEndAction => ({
      type: ResizableActionTypes.RESIZE_END,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });
  };
}
