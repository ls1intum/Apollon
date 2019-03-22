import { Reducer, Action as ReduxAction } from 'redux';
import {
  ActionTypes,
  EditorMode,
  InteractiveElementsMode,
  EditorState,
} from './types';
import { ApollonMode } from '../../ApollonEditor';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
  options: Partial<EditorState>;
}

type Actions = Action<ActionTypes.UPDATE>;

class EditorService {
  static initialState: EditorState = {
    gridSize: 10,
    readonly: false,
    mode: ApollonMode.Exporting,
    editorMode: EditorMode.ModelingView,
    interactiveMode: InteractiveElementsMode.Highlighted,
  };

  static update = (options: Partial<EditorState>) => ({
    type: ActionTypes.UPDATE,
    options,
  });

  static reducer: Reducer<EditorState, Actions> = (
    state = EditorService.initialState,
    action
  ) => {
    switch (action.type) {
      case ActionTypes.UPDATE:
        return {
          ...state,
          ...action.options,
        };
    }
    return state;
  };
}

export default EditorService;
