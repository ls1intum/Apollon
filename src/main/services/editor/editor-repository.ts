import {
  ApollonView,
  SetSelectionBoxAction,
  ChangeViewAction,
  SetZoomFactorAction,
  EditorActionTypes,
} from './editor-types';

export class EditorRepository {
  static changeView = (view: ApollonView): ChangeViewAction => ({
    type: EditorActionTypes.CHANGE_VIEW,
    payload: { view },
    undoable: false,
  });
  static setZoomFactor = (zoomFactor: number): SetZoomFactorAction => ({
    type: EditorActionTypes.SET_ZOOM_FACTOR,
    payload: { zoomFactor },
    undoable: false,
  });
  static setSelectionBoxActive = (selectionBoxActive: boolean): SetSelectionBoxAction => ({
    type: EditorActionTypes.SET_SELECTION_BOX,
    payload: { selectionBoxActive },
    undoable: false,
  });
}
