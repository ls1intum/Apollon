import { UMLElementSelectorType } from '../../../packages/uml-element-selector-type';
import {
  RemoteSelectionActionTypes,
  RemoteSelectionChange,
  RemoteSelectionChangeAction,
  RemoteSelectionChangeTypes,
  RemoteSelectionPruneSelectorsAction,
} from './remote-selectable-types';

export const RemoteSelectable = {
  remoteSelectionChange: (
    selector: UMLElementSelectorType,
    changes: RemoteSelectionChange[],
  ): RemoteSelectionChangeAction => ({
    type: RemoteSelectionActionTypes.SELECTION_CHANGE,
    payload: {
      selector,
      changes,
    },
    undoable: false,
  }),

  remoteSelect: (selector: UMLElementSelectorType, ids: string[]): RemoteSelectionChangeAction =>
    RemoteSelectable.remoteSelectionChange(
      selector,
      ids.map((id) => ({ type: RemoteSelectionChangeTypes.SELECT, id })),
    ),

  remoteDeselect: (selector: UMLElementSelectorType, ids: string[]): RemoteSelectionChangeAction =>
    RemoteSelectable.remoteSelectionChange(
      selector,
      ids.map((id) => ({ type: RemoteSelectionChangeTypes.DESELECT, id })),
    ),

  remoteSelectDeselect: (
    selector: UMLElementSelectorType,
    select: string[],
    deselect: string[],
  ): RemoteSelectionChangeAction =>
    RemoteSelectable.remoteSelectionChange(selector, [
      ...select.map((id) => ({ type: RemoteSelectionChangeTypes.SELECT, id })),
      ...deselect.map((id) => ({ type: RemoteSelectionChangeTypes.DESELECT, id })),
    ]),

  pruneRemoteSelectors: (allowedSelectors: UMLElementSelectorType[]): RemoteSelectionPruneSelectorsAction => ({
    type: RemoteSelectionActionTypes.PRUNE_SELECTORS,
    payload: {
      allowedSelectors,
    },
    undoable: false,
  }),
};
