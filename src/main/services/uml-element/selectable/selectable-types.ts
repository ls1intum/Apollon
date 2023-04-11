import { Action } from '../../../utils/actions/actions';

export const enum SelectableActionTypes {
  SELECT = '@@element/selectable/SELECT',
  DESELECT = '@@element/selectable/DESELECT',
  START_SELECTION_BOX = '@@element/selectable/START_SELECTION_BOX',
  END_SELECTION_BOX = '@@element/selectable/END_SELECTION_BOX'
}

export type SelectableState = {
  ids: string[],
  selectionBoxActive: boolean;
};

export type SelectableActions = SelectAction | DeselectAction | StartSelectionBox | EndSelectionBox;

export type SelectAction = Action<SelectableActionTypes.SELECT> & {
  payload: {
    ids: string[];
  };
};

export type DeselectAction = Action<SelectableActionTypes.DESELECT> & {
  payload: {
    ids: string[];
  };
};

export type StartSelectionBox = Action<SelectableActionTypes.START_SELECTION_BOX>;

export type EndSelectionBox = Action<SelectableActionTypes.END_SELECTION_BOX>;
