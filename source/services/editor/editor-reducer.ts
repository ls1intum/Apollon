import { Reducer } from 'redux';
import { EditorState, Actions, EditorActionTypes, ApollonView } from './editor-types';
import { ApollonMode } from '../../typings';

const initialState: EditorState = {
  readonly: false,
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
