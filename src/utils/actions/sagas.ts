import { SAGA_ACTION } from '@redux-saga/symbols';
import { Saga, SagaIterator } from 'redux-saga';
import { all, call, Effect, spawn } from 'redux-saga/effects';
import { Action } from './actions';

export const isInternal = <T extends Action>(action: T): boolean => {
  return SAGA_ACTION in action;
};

export const composeSaga = (sagas: Saga[]): Effect => {
  return all(sagas.map(spawn));
};

export const run = (sagas: Saga[]): Effect => {
  return all(sagas.map(saga => keepAlive(safely(saga))));
};

export const keepAlive = (saga: Saga): Effect => {
  return spawn(function* () {
    while (true) {
      yield call(saga);
    }
  });
};

export const safely = (saga: Saga): Saga => {
  function* safelySaga(): SagaIterator {
    try {
      yield call(saga);
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  }
  return safelySaga as Saga;
};
