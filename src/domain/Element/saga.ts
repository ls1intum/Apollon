import { takeLatest, put, select, all } from 'redux-saga/effects';
import {
  ActionTypes,
  HoverAction,
  LeaveAction,
  SelectAction,
  State,
} from './types';
import Element from './Element';
import Repository from './repository';

function* saga() {
  yield takeLatest(ActionTypes.HOVER, handleElementHover);
  yield takeLatest(ActionTypes.LEAVE, handleElementLeave);
  yield takeLatest(ActionTypes.SELECT, handleElementSelect);
}

function* handleElementHover({ payload }: HoverAction) {
  if (payload.internal) return;
  const elements = yield select(state => state.elements);
  const element: Element = elements[payload.id];
  if (element.owner) {
    yield put(Repository.leave(element.owner, true));
  }
}

function* handleElementLeave({ payload }: LeaveAction) {
  if (payload.internal) return;
  const elements: State = yield select(state => state.elements);
  const element = elements[payload.id];
  if (element.owner) {
    yield put(Repository.hover(element.owner, true));
  }
}

function* handleElementSelect({ payload }: SelectAction) {
  if (payload.toggle) return;
  const elements: State = yield select(state => state.elements);
  const selection = Object.values(elements).filter(
    element => element.selected && element.id !== payload.id
  );
  yield all(selection.map(element => put(Repository.select(element.id, true))));
}

export default saga;
