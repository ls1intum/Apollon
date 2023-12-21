import { Reducer } from 'redux';
import {
  RemoteSelectionActionTypes,
  RemoteSelectionChangeTypes,
  RemoteSelectionState,
} from './remote-selectable-types';
import { Actions } from '../../actions';
import { UMLElementSelectorType } from '../../../packages/uml-element-selector-type';

const sameSelector = (a: UMLElementSelectorType, b: UMLElementSelectorType) => {
  return a && b && a.name === b.name && a.color === b.color;
};

export const RemoteSelectionReducer: Reducer<RemoteSelectionState, Actions> = (state = {}, action) => {
  switch (action.type) {
    case RemoteSelectionActionTypes.SELECTION_CHANGE:
      const { payload } = action;
      const { selector, changes } = payload;

      return changes.reduce<RemoteSelectionState>((selection, change) => {
        const { id } = change;
        const selectors: UMLElementSelectorType[] = [...(selection[id] ?? [])];

        if (change.type === RemoteSelectionChangeTypes.SELECT && !selectors.some((s) => sameSelector(s, selector))) {
          selectors.push(selector);
        } else if (change.type === RemoteSelectionChangeTypes.DESELECT) {
          const index = selectors.findIndex((s) => sameSelector(s, selector));
          if (index >= 0) {
            selectors.splice(index, 1);
          }
        }

        return {
          ...selection,
          [id]: selectors,
        };
      }, state);

    case RemoteSelectionActionTypes.PRUNE_SELECTORS:
      const { allowedSelectors } = action.payload;

      return Object.fromEntries(
        Object.entries(state).map(([id, selectors]) => {
          return [id, selectors.filter((s) => allowedSelectors.some((selector) => sameSelector(s, selector)))];
        }),
      );
  }

  return state;
};
