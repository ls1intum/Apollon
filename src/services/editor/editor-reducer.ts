import { Reducer } from 'redux';
import { ApollonMode } from '../../typings';
import { Actions, ApollonView, EditorActionTypes, EditorState } from './editor-types';

const initialState: EditorState = {
  readonly: false,
  enablePopups: true,
  mode: ApollonMode.Exporting,
  view: ApollonView.Modelling,
};

export const EditorReducer: Reducer<EditorState, Actions> = (state = initialState, action) => {
  switch (action.type) {
    case EditorActionTypes.CHANGE_VIEW: {
      const { payload } = action;
      return {
        ...state,
        view: payload.view,
      };
    }
  }
  return state;
};
