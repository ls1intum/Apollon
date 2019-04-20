import { Action } from '../../../utils/actions/actions';

export const enum ResizableActionTypes {
  RESIZE_START = '@@element/resizable/RESIZE_START',
  RESIZE = '@@element/resizable/RESIZE',
  RESIZE_END = '@@element/resizable/RESIZE_END',
}

export type ResizableActions = ResizeStartAction | ResizeAction | ResizeEndAction;

export interface ResizeStartAction extends Action<ResizableActionTypes.RESIZE_START> {
  payload: {
    ids: string[];
  };
}

export interface ResizeAction extends Action<ResizableActionTypes.RESIZE> {
  payload: {
    ids: string[];
    delta: {
      width: number;
      height: number;
    };
  };
}

export interface ResizeEndAction extends Action<ResizableActionTypes.RESIZE_END> {
  payload: {
    ids: string[];
  };
}
