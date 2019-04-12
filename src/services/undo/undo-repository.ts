import { RedoAction, UndoAction, UndoActionTypes } from './undo-types';

export class UndoRepository {
  static undo = (): UndoAction => ({ type: UndoActionTypes.UNDO });
  static redo = (): RedoAction => ({ type: UndoActionTypes.REDO });
}
