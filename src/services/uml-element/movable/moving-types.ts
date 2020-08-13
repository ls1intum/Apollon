import { Action } from '../../../utils/actions/actions';
import { UMLElementState } from '../uml-element-types';
import { IUMLElement } from '../uml-element';

export const enum MovingActionTypes {
  END = '@@element/moving/END',
}

export type MovingState = UMLElementState;

export type MovingActions = MovingEndAction;

export type MovingEndAction = Action<MovingActionTypes.END> & {
  payload: {
    elements: IUMLElement[];
  };
};
