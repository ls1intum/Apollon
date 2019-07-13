import { Action } from '../../utils/actions/actions';

export const enum UndoActionTypes {
  UNDO = '@@undo/UNDO',
  REDO = '@@undo/REDO',
}

export type UndoActions = UndoAction | RedoAction;

export type UndoAction = Action<UndoActionTypes.UNDO>;
export type RedoAction = Action<UndoActionTypes.REDO>;
