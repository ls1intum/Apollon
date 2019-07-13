import { ApollonView, ChangeViewAction, EditorActionTypes } from './editor-types';

export class EditorRepository {
  static changeView = (view: ApollonView): ChangeViewAction => ({
    type: EditorActionTypes.CHANGE_VIEW,
    payload: { view },
    undoable: false,
  });
}
