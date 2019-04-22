import { Action } from '../../../utils/actions/actions';

export const enum ResizableActionTypes {
  RESIZE_START = '@@element/resizable/RESIZE_START',
  RESIZE_END = '@@element/resizable/RESIZE_END',
}

export type ResizableState = string[];

export type ResizableActions = ResizeStartAction | ResizeEndAction;

export interface ResizeStartAction extends Action<ResizableActionTypes.RESIZE_START> {
  payload: {
    ids: string[];
  };
}

export interface ResizeEndAction extends Action<ResizableActionTypes.RESIZE_END> {
  payload: {
    ids: string[];
  };
}
