import { Action } from '../../../utils/actions/actions.js';
import { UMLElementState } from '../uml-element-types.js';

export const enum ResizingActionTypes {
  RESIZE = '@@element/resizable/RESIZE',
}

export type ResizingState = UMLElementState;

export type ResizingActions = ResizeAction;

export type ResizeAction = Action<ResizingActionTypes.RESIZE> & {
  payload: {
    ids: string[];
    delta: {
      width: number;
      height: number;
    };
  };
};
