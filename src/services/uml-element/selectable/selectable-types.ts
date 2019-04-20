import { Action } from '../../../utils/actions/actions';

export const enum SelectableActionTypes {
  SELECT = '@@element/selectable/SELECT',
  DESELECT = '@@element/selectable/DESELECT',
}

export type SelectableActions = SelectAction | DeselectAction;

export interface SelectAction extends Action<SelectableActionTypes.SELECT> {
  payload: {
    ids: string[];
    toggle: boolean;
  };
}

export interface DeselectAction extends Action<SelectableActionTypes.DESELECT> {
  payload: {
    ids: string[];
  };
}

export interface SelectableState extends Array<string> {}
