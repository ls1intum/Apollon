import { RedoAction, UndoAction, UndoActionTypes } from './undo-types.js';

export class UndoRepository {
  static undo = (): UndoAction => ({ type: UndoActionTypes.UNDO, payload: {}, undoable: false });
  static redo = (): RedoAction => ({ type: UndoActionTypes.REDO, payload: {}, undoable: false });
}
