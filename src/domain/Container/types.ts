import { DeepReadonly } from 'ts-essentials';
import { Action } from 'redux';

export const enum ActionTypes {
  ADD_CHILD = '@@container/ADD_CHILD',
}

export interface AddChildAction extends Action<ActionTypes.ADD_CHILD> {
  payload: {
    parent: string;
    child: string;
  };
}

export type Actions = DeepReadonly<AddChildAction>;
