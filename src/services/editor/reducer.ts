import { Reducer } from 'redux';
import { State, Actions, ActionTypes, ApollonView } from './types';
import { ApollonMode } from '../../ApollonEditor';

const initialState: State = {
  readonly: false,
  mode: ApollonMode.Exporting,
  view: ApollonView.Modelling,
};

export const reducer: Reducer<State, Actions> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case ActionTypes.CHANGE_VIEW: {
      const { payload } = action;
      return {
        ...state,
        view: payload.view,
      };
    }
  }
  return state;
};
