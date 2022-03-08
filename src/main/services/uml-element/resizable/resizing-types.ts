import { Action } from '../../../utils/actions/actions';
import { UMLElementState } from '../uml-element-types';

export const enum ResizingActionTypes {
  RESIZE = '@@element/resizable/RESIZE',
  RESIZE_WITH_REPOSITION = '@@element/resizable/RESIZE_WITH_REPOSITION',
}

export type ResizingState = UMLElementState;

export type ResizingActions = ResizeAction | ResizeRepositionAction;

export type ResizeAction = Action<ResizingActionTypes.RESIZE> & {
  payload: {
    ids: string[];
    delta: {
      width: number;
      height: number;
    };
  };
};

export type ResizeRepositionAction = Action<ResizingActionTypes.RESIZE_WITH_REPOSITION> & {
  payload: {
    ids: string[];
    resizeFrom: string;
    delta: {
      width: number;
      height: number;
    };
  };
};
