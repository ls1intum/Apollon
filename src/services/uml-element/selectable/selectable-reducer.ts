import { Reducer } from 'redux';
import { SelectableActions, SelectableActionTypes, SelectableState } from './selectable-types';

const initialState: SelectableState = [];

export const SelectableReducer: Reducer<SelectableState, SelectableActions> = (state = initialState, action) => {
  switch (action.type) {
    case SelectableActionTypes.SELECT: {
      const { payload } = action;
      const selection = payload.toggle ? [] : state;
      return [...new Set([...payload.ids, ...selection])];
    }
    case SelectableActionTypes.DESELECT: {
      const { payload } = action;
      return state.filter(id => !payload.ids.includes(id));
    }
  }
  return state;
};
