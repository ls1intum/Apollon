import { Action as ReduxAction } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { ModelState } from '../../components/store/model-state';

export interface Action<T = any> extends ReduxAction<T> {
  payload: object;
}

export interface RedoableAction<T = any> extends Action<T> {
  redoable: true;
}

export type AsyncDispatch<R> = ThunkAction<R, ModelState, undefined, Action>;
