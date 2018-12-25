import { Action as ReduxAction } from 'redux';
import { ActionTypes, DiagramState } from './DiagramTypes';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
}

export type Actions = Action<any>;
