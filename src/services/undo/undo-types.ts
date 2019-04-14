import { Action } from 'redux';

export const enum UndoActionTypes {
  UNDO = '@@undo/UNDO',
  REDO = '@@undo/REDO',
}

export type UndoActions = UndoAction | RedoAction;

export interface UndoAction extends Action<UndoActionTypes.UNDO> {}
export interface RedoAction extends Action<UndoActionTypes.REDO> {}
