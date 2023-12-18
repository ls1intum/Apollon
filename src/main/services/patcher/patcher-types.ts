import { Operation } from 'fast-json-patch';

import { Actions } from '../actions';
import { Action } from '../../utils/actions/actions';
import { SelectableActionTypes } from '../uml-element/selectable/selectable-types';
import { MovingActionTypes } from '../uml-element/movable/moving-types';
import { ResizingActionTypes } from '../uml-element/resizable/resizing-types';

/**
 * Returns true if the action is discrete, i.e. if it is not in middle of
 * a user action.
 */
export const isDiscreteAction = (action: Actions): boolean => {
  return (
    action.type.endsWith('END') ||
    action.type.endsWith('DELETE') ||
    action.type.endsWith('UNDO') ||
    action.type.endsWith('REDO')
  );
};

/**
 * Returns true if the action is a selection action.
 */
export const isSelectionAction = (action: Actions): boolean => {
  return action.type === SelectableActionTypes.SELECT || action.type === SelectableActionTypes.DESELECT;
};

export const isContinuousAction = (action: Actions): boolean => {
  return action.type === MovingActionTypes.MOVE || action.type === ResizingActionTypes.RESIZE;
};

/**
 * A patch is a list of operations that can be applied to an object
 * to change them in some desired manner. See [JSON patch](http://jsonpatch.com/) for more info.
 */
export type Patch = Operation[];
export type PatchListener = (patch: Patch) => void;

export const enum PatcherActionTypes {
  PATCH = '@@patcher/PATCH',
}

export type PatcherActions = PatchAction;
export type PatchAction = Action<PatcherActionTypes.PATCH>;
