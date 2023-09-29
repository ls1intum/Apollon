import { Reducer } from 'redux';
import { Actions } from '../actions';
import { ApollonMode, ApollonView, EditorActionTypes, EditorState } from './editor-types';

const initialState: EditorState = {
  readonly: false,
  colorEnabled: false,
  enablePopups: true,
  enableCopyPasteToClipboard: false,
  mode: ApollonMode.Exporting,
  view: ApollonView.Modelling,
  scale: 1.0,
  zoomFactor: 1.0,
  features: {
    hoverable: true,
    selectable: true,
    movable: true,
    resizable: true,
    connectable: true,
    updatable: true,
    droppable: true,
    alternativePortVisualization: false,
  },
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
    case EditorActionTypes.CHANGE_ZOOM_FACTOR: {
      const { payload } = action;

      return {
        ...state,
        zoomFactor: payload.zoomFactor,
      };
    }
  }
  return state;
};
