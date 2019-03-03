import { take, takeLatest, put, select } from 'redux-saga/effects';
import { AnyAction } from 'redux';
import { ContainerActionTypes } from '../Container';
import { AddChildAction } from '../Container/types';
import { ElementActionTypes } from '../Element';
import { CreateAction } from '../Element/types';

function* saga() {
  yield takeLatest(ElementActionTypes.CREATE, handleChildCreation);
  // while (true) {
  //   yield handleDelete();
  // }
}

function* handleChildCreation({ payload }: CreateAction) {
  if (payload.element.owner) return;
  yield put({ type: '@@diagram/CREATE', element: payload.element });
}

function* handleDelete() {
  const action: AnyAction = yield take('@@element/DELETE');
  yield put({ type: '@@diagram/DELETE', id: action.payload.id });
}

export default saga;
