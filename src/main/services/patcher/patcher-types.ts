import { Operation } from 'fast-json-patch';

import { Actions } from '../actions';
import { Action } from '../../utils/actions/actions';
import { SelectableActionTypes } from '../uml-element/selectable/selectable-types';

export const isDiscreteAction = (action: Actions): boolean => {
  return (
    action.type.endsWith('END') ||
    action.type.endsWith('DELETE') ||
    action.type.endsWith('UNDO') ||
    action.type.endsWith('REDO')
  );
};

export const isSelectionAction = (action: Actions): boolean => {
  return action.type === SelectableActionTypes.SELECT || action.type === SelectableActionTypes.DESELECT;
};

export type Patch = Operation[];
export type PatchListener = (patch: Patch) => void;

export const enum PatcherActionTypes {
  PATCH = '@@patcher/PATCH',
}

export type PatcherActions = PatchAction;
export type PatchAction = Action<PatcherActionTypes.PATCH>;
