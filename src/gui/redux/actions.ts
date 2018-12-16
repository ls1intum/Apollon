import { InteractiveElementsAction } from './interactiveElements/actions';
import { RelationshipsAction } from './relationships/actions';
import { UndoRedoAction } from './undoRedo/actions';

import { Actions } from './../../domain/Element/repository';

export * from './interactiveElements/actions';
export * from './relationships/actions';
export * from './undoRedo/actions';

export type ReduxAction =
  | InteractiveElementsAction
  | RelationshipsAction
  | UndoRedoAction
  | Actions;
