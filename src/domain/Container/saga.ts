import { take, put, all, select } from 'redux-saga/effects';
import Container from './Container';
import Element, { ElementRepository } from '../Element';

function* saga() {
  while (true) {
    yield handleDelete();
  }
}

function* handleDelete() {
  const { element }: { element: Element } = yield take('@@element/DELETE');
  const elements = yield select(state => state.elements);
  if (element instanceof Container) {
    for (const id of element.ownedElements) {
      const child = ElementRepository.getById(elements)(id);
      yield put({ type: '@@element/DELETE', element: child });
    }
  }
}

export default saga;
