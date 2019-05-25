import { Action as ReduxAction } from 'redux';
import { PutEffect } from 'redux-saga/effects';
import { ThunkAction, ThunkDispatch } from 'redux-thunk';
import { ModelState } from '../../components/store/model-state';

export interface Action<T = any> extends ReduxAction<T> {
  payload: object;
}

export interface RedoableAction<T = any> extends Action<T> {
  redoable: true;
}

export type AsyncAction<R = void> = ThunkAction<R, ModelState, undefined, Action>;

export type Dispatch = ThunkDispatch<ModelState, undefined, Action>;

export type AsyncDispatch<T extends (...args: any[]) => AsyncAction<any>> = (
  ...args: Parameters<T>
) => T extends (...args: any[]) => AsyncAction<infer R> ? ReturnType<AsyncAction<R>> : any;

declare module 'redux-saga/effects' {
  export function put<A extends Action>(action: A | AsyncAction): PutEffect<A>;
}
