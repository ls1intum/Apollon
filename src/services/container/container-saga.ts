import { takeLatest, takeEvery, all, put, select } from 'redux-saga/effects';
import { ModelState } from '../../components/Store';
import { Container } from './container';
import { ElementRepository } from '../element';
import { CreateAction, ResizeAction, DeleteAction, MoveAction, ChangeAction, ElementActionTypes } from '../element/element-types';
import { ContainerActionTypes, ChangeOwnerAction, AppendChildAction, RemoveChildAction } from './container-types';
import { notEmpty } from '../../domain/utils';

export function* ContainerSaga() {
  yield takeEvery(ContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
  yield takeEvery(ElementActionTypes.CREATE, handleElementCreation);
  yield takeLatest(ElementActionTypes.CREATE, handleChildAdd);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementResize);
  yield takeLatest(ElementActionTypes.CHANGE, handleElementChange);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDelete);
}

function* handleOwnerChange({ payload }: ChangeOwnerAction) {
  if (!payload.id || payload.id === payload.owner) return;

  const { elements }: ModelState = yield select();
  const selection = Object.values(elements).filter(element => element.selected);
  if (selection.length > 1) return;

  const element = ElementRepository.getById(elements)(payload.id);
  if (!element || payload.owner === element.owner) return;

  const owner = payload.owner && ElementRepository.getById(elements)(payload.owner);

  const current = element.owner && ElementRepository.getById(elements)(element.owner);
  if (owner && !(owner.constructor as typeof Container).features.droppable) return;

  if (current) {
    yield put<RemoveChildAction>({
      type: ContainerActionTypes.REMOVE_CHILD,
      payload: { id: element.id, owner: current.id },
    });

    let ownerID: string | null = current.id;
    let position = { x: 0, y: 0 };
    while (ownerID) {
      const owner = ElementRepository.getById(elements)(ownerID);
      if (!owner) break;
      position.x += owner.bounds.x;
      position.y += owner.bounds.y;
      ownerID = owner.owner;
    }

    yield put<MoveAction>(ElementRepository.move(element.id, position));
  }

  if (owner) {
    yield put<AppendChildAction>({
      type: ContainerActionTypes.APPEND_CHILD,
      payload: { id: element.id, owner: owner.id },
    });
    let ownerID: string | null = owner.id;
    let position = { x: 0, y: 0 };
    while (ownerID) {
      const owner = ElementRepository.getById(elements)(ownerID);
      if (!owner) break;
      position.x -= owner.bounds.x;
      position.y -= owner.bounds.y;
      ownerID = owner.owner;
    }

    yield put<MoveAction>(ElementRepository.move(element.id, position));
  }
}

function* handleElementCreation({ payload }: CreateAction) {
  if (payload.element instanceof Container) {
    const updates = payload.element.render([]);
    yield all(updates.map(element => put(ElementRepository.update(element.id, element))));
  }
}

function* handleChildAdd({ payload }: CreateAction) {
  if (!payload.element.owner) return;

  const { elements }: ModelState = yield select();
  const parent = ElementRepository.getById(elements)(payload.element.owner);
  if (parent instanceof Container) {
    const children = parent.ownedElements
      .filter(id => id !== payload.element.id)
      .map(ElementRepository.getById(elements))
      .filter(notEmpty);

    const updates = parent.addElement(payload.element, children);
    yield all(updates.map(element => put(ElementRepository.update(element.id, element))));
  }
}

function* handleElementDelete({ payload }: DeleteAction) {
  const elementId = payload.id;
  if (!elementId) return;

  const { elements }: ModelState = yield select();

  const parent = Object.keys(elements)
    .filter(id => 'ownedElements' in elements[id])
    .map<Container>(id => ElementRepository.getById(elements)(id) as Container)
    .find(element => element.ownedElements.includes(elementId));

  if (parent) {
    const children = parent.ownedElements
      .filter(id => id !== payload.id)
      .map(ElementRepository.getById(elements))
      .filter(notEmpty);

    const updates = parent.removeElement(elementId, children);
    yield all(updates.map(element => put(ElementRepository.update(element.id, element))));
  }

  const children = Object.keys(elements).filter(id => elements[id].owner === elementId);
  yield all(children.map(id => put(ElementRepository.delete(id))));
}

function* handleElementChange({ payload }: ChangeAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;
  if (element instanceof Container) {
    const children = element.ownedElements.map(ElementRepository.getById(elements)).filter(notEmpty);
    const updates = element.render(children);
    yield all(updates.map(element => put(ElementRepository.update(element.id, element))));
  }
}

function* handleElementResize({ payload }: ResizeAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (element instanceof Container) {
    const children = element.ownedElements.map(ElementRepository.getById(elements)).filter(notEmpty);
    const updates = element.resizeElement(children);
    yield all(updates.map(element => put(ElementRepository.update(element.id, element))));
  }
}
