import {ApollonView, ChangeScaleAction, ChangeViewAction, EditorActionTypes} from './editor-types';

export class EditorRepository {
  static changeView = (view: ApollonView): ChangeViewAction => ({
    type: EditorActionTypes.CHANGE_VIEW,
    payload: { view },
    undoable: false,
  });
  static changeScale = (scale: number): ChangeScaleAction => ({
    type: EditorActionTypes.CHANGE_SCALE,
    payload: { scale },
    undoable: false,
  });
}
