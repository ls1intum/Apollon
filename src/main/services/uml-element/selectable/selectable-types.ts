import { Action } from '../../../utils/actions/actions';

export const enum SelectableActionTypes {
  SELECT = '@@element/selectable/SELECT',
  DESELECT = '@@element/selectable/DESELECT',
}

export type SelectableState = string[];

export type SelectableActions = SelectAction | DeselectAction;

export type SelectAction = Action<SelectableActionTypes.SELECT> & {
  payload: {
    ids: string[];
    overwrite?: boolean;
  };
};

export type DeselectAction = Action<SelectableActionTypes.DESELECT> & {
  payload: {
    ids: string[];
  };
};
