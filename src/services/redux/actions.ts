import { InteractiveElementsAction } from './interactiveElements/actions';
import { UndoRedoAction } from './undoRedo/actions';

export * from './interactiveElements/actions';
export * from './undoRedo/actions';

export type ReduxAction =
  | InteractiveElementsAction
  | UndoRedoAction;
