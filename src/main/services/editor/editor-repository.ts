import { ApollonView, ChangeViewAction, ChangeZoomFactorAction, EditorActionTypes } from './editor-types';

export class EditorRepository {
  static changeView = (view: ApollonView): ChangeViewAction => ({
    type: EditorActionTypes.CHANGE_VIEW,
    payload: { view },
    undoable: false,
  });
  static changeZoomFactor = (zoomFactor: number): ChangeZoomFactorAction => ({
    type: EditorActionTypes.CHANGE_ZOOM_FACTOR,
    payload: { zoomFactor },
    undoable: false,
  });
}
