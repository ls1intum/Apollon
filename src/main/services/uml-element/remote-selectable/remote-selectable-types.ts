import { UMLElementSelectorType } from '../../../packages/uml-element-selector-type';
import { Action } from '../../../utils/actions/actions';

export const enum RemoteSelectionActionTypes {
  SELECTION_CHANGE = '@@element/remote-selection/CHANGE',
  PRUNE_SELECTORS = '@@element/remote-selection/PRUNE_SELECTORS',
}

export const enum RemoteSelectionChangeTypes {
  SELECT = '@@element/remote-selection/SELECT',
  DESELECT = '@@element/remote-selection/DESELECT',
}

export interface RemoteSelectionChange {
  type: RemoteSelectionChangeTypes.SELECT | RemoteSelectionChangeTypes.DESELECT;
  id: string;
}

export type RemoteSelectionChangeAction = Action<RemoteSelectionActionTypes.SELECTION_CHANGE> & {
  payload: {
    changes: RemoteSelectionChange[];
    selector: UMLElementSelectorType;
  };
};

export type RemoteSelectionPruneSelectorsAction = Action<RemoteSelectionActionTypes.PRUNE_SELECTORS> & {
  payload: {
    allowedSelectors: UMLElementSelectorType[];
  };
};

export type RemoteSelectionState = {
  [id: string]: UMLElementSelectorType[];
};

export type RemoteSelectionActions = RemoteSelectionChangeAction | RemoteSelectionPruneSelectorsAction;
