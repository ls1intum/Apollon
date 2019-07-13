import { Action } from '../../../utils/actions/actions';

export const enum ResizableActionTypes {
  START = '@@element/resizable/START',
  END = '@@element/resizable/END',
}

export type ResizableState = string[];

export type ResizableActions = ResizeStartAction | ResizeEndAction;

export type ResizeStartAction = Action<ResizableActionTypes.START> & {
  payload: {
    ids: string[];
  };
};

export type ResizeEndAction = Action<ResizableActionTypes.END> & {
  payload: {
    ids: string[];
  };
};
