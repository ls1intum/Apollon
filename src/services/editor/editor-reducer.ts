import { Reducer } from 'redux';
import { ApollonMode } from '../../typings';
import { ApollonView, EditorActions, EditorActionTypes, EditorState } from './editor-types';

const initialState: EditorState = {
  readonly: false,
  enablePopups: true,
  mode: ApollonMode.Exporting,
  view: ApollonView.Modelling,
  features: {
    hoverable: true,
    selectable: true,
    movable: true,
    resizable: true,
    connectable: true,
    updatable: true,
    droppable: true,
  },
};

export const EditorReducer: Reducer<EditorState, EditorActions> = (state = initialState, action) => {
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
