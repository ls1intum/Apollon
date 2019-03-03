import { takeLatest, all, put, select } from 'redux-saga/effects';
import { State } from './../../components/Store';
import Container from './Container';
import { ElementRepository, ElementActionTypes } from '../Element';
import { ResizeAction, DeleteAction, CreateAction } from '../Element/types';

function* saga() {
  yield takeLatest(ElementActionTypes.CREATE, handleElementCreation);
  yield takeLatest(ElementActionTypes.CREATE, handleChildAdd);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementResize);
  yield takeLatest(ElementActionTypes.DELETE, handleRecursiveDelete);
  yield takeLatest(ElementActionTypes.DELETE, handleSelectionDelete);
}

function* handleElementCreation({ payload }: CreateAction) {
  if (payload.element instanceof Container) {
    const updates = payload.element.render([]);
    yield all(updates.map(element => put(ElementRepository.update(element))));
  }
}

function* handleChildAdd({ payload }: CreateAction) {
  if (!payload.element.owner) return;

  const { elements }: State = yield select();
  const parent = ElementRepository.getById(elements)(payload.element.owner);
  if (parent instanceof Container) {
    const children = parent.ownedElements
      .filter(id => id !== payload.element.id)
      .map(ElementRepository.getById(elements));

    const updates = parent.addElement(payload.element, children);
    yield all(updates.map(element => put(ElementRepository.update(element))));
  }
}

function* handleRecursiveDelete({ payload }: DeleteAction) {
  if (!payload.id) return;

  const { elements }: State = yield select();
  const children = Object.keys(elements).filter(
    id => elements[id].owner === payload.id
  );
  yield all(children.map(id => put(ElementRepository.delete(id))));
}

function* handleSelectionDelete({ payload }: DeleteAction) {
  if (payload.id) return;

  const { elements }: State = yield select();
  const selection = Object.values(elements).filter(
    element => element.selected && element.id !== payload.id
  );
  yield all(
    selection.map(element => put(ElementRepository.delete(element.id)))
  );
}

function* handleElementResize({ payload }: ResizeAction) {
  const { elements }: State = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (element instanceof Container) {
    const children = element.ownedElements.map(
      ElementRepository.getById(elements)
    );
    const updates = element.resizeElement(children);
    yield all(updates.map(element => ElementRepository.update(element)));
  }
}

export default saga;
