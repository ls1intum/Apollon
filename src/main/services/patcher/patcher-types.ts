import { Operation } from 'fast-json-patch';
import { Middleware } from 'redux';

import { Actions } from '../actions';
import { SelectableActionTypes } from '../uml-element/selectable/selectable-types';


// TODO: these aren't specific to patcher, they should rather be moved
//       to a more general place

export const isDiscreteAction = (action: Actions) => {
  return action.type.endsWith('END') ||
    action.type.endsWith('DELETE') ||
    action.type.endsWith('UNDO') ||
    action.type.endsWith('REDO');
};


export const isSelectionAction = (action: Actions) => {
  return action.type ===  SelectableActionTypes.SELECT ||
    action.type === SelectableActionTypes.DESELECT;
};


export type Patch = Operation[];
export type PatchListener = (patch: Patch) => void;
export type PatcherMiddleware<T> = Middleware<{}, T>;
export type PatchStreamer<T, A> = (source: T, action: A, stream: (op: Operation) => void) => void;
