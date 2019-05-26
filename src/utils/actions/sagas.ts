import { Saga, SagaIterator } from 'redux-saga';
import { all, call, Effect, spawn } from 'redux-saga/effects';

export function composeSaga(sagas: Saga[]): Effect {
  return all(sagas.map(spawn));
}

export function run(sagas: Saga[]): Effect {
  return all(sagas.map(saga => keepAlive(safely(saga))));
}

export const keepAlive = (saga: Saga): Effect => {
  return spawn(function*() {
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
      console.log('error', e);
    }
  }
  return safelySaga as Saga;
};
