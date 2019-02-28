import { take, takeLatest, put, select } from 'redux-saga/effects';
import { AnyAction } from 'redux';

function* saga() {
  while (true) {
    yield takeLatest('@@element/CREATE', handleCreate)
    yield handleDelete();
  }
}

function* handleCreate(action: AnyAction) {
  if (!action.payload.element.owner) {
    yield put({ type: '@@diagram/CREATE', element: action.payload.element });
  }
}

function* handleDelete() {
  const action: AnyAction = yield take('@@element/DELETE');
  yield put({ type: '@@diagram/DELETE', id: action.payload.id });
}

export default saga;
