import { Action } from '../../../utils/actions/actions';
import { ResizeFrom } from '../uml-element';
import { UMLElementState } from '../uml-element-types';

export const enum ResizingActionTypes {
  RESIZE = '@@element/resizable/RESIZE',
}

export type ResizingState = UMLElementState;

export type ResizingActions = ResizeAction;

export type ResizeAction = Action<ResizingActionTypes.RESIZE> & {
  payload: {
    ids: string[];
    resizeFrom: ResizeFrom;
    delta: {
      width: number;
      height: number;
    };
  };
};
