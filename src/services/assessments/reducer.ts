import { Reducer } from 'redux';
import { State, Actions, ActionTypes } from './types';

const initialState: State = {};

export const reducer: Reducer<State, Actions> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case ActionTypes.ASSESS: {
      const { payload } = action;
      return {
        ...state,
        [payload.element]: payload.assessment,
      };
    }
  }
  return state;
};
