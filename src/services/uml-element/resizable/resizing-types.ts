import { Action } from '../../../utils/actions/actions';
import { UMLElementState } from '../uml-element-types';

export const enum ResizingActionTypes {
  RESIZE = '@@element/resizable/RESIZE',
}

export type ResizingState = UMLElementState;

export type ResizingActions = ResizeAction;

export interface ResizeAction extends Action<ResizingActionTypes.RESIZE> {
  payload: {
    ids: string[];
    delta: {
      width: number;
      height: number;
    };
  };
}
