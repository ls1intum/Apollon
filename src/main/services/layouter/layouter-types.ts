import { Action } from '../../utils/actions/actions.js';

export const enum LayouterActionTypes {
  LAYOUT = '@@layouter/LAYOUT',
}

export type LayouterActions = LayoutAction;

export type LayoutAction = Action<LayouterActionTypes.LAYOUT>;
