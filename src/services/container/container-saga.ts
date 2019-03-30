import { all, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { notEmpty } from '../../utils/not-empty';
import { ElementRepository } from '../element/element-repository';
import { ChangeAction, CreateAction, DeleteAction, ElementActionTypes, MoveAction, ResizeAction } from '../element/element-types';
import { Container } from './container';
import { AppendChildAction, ChangeOwnerAction, ContainerActionTypes, RemoveChildAction } from './container-types';

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
  const selection = Object.values(elements).filter(e => e.selected);
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
    const position = { x: 0, y: 0 };
    while (ownerID) {
      const o = ElementRepository.getById(elements)(ownerID);
      if (!o) break;
      position.x += o.bounds.x;
      position.y += o.bounds.y;
      ownerID = o.owner;
    }

    yield put<MoveAction>(ElementRepository.move(element.id, position));
  }

  if (owner) {
    yield put<AppendChildAction>({
      type: ContainerActionTypes.APPEND_CHILD,
      payload: { id: element.id, owner: owner.id },
    });
    let ownerID: string | null = owner.id;
    const position = { x: 0, y: 0 };
    while (ownerID) {
      const o = ElementRepository.getById(elements)(ownerID);
      if (!o) break;
      position.x -= o.bounds.x;
      position.y -= o.bounds.y;
      ownerID = o.owner;
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

  const owned = Object.keys(elements).filter(id => elements[id].owner === elementId);
  yield all(owned.map(id => put(ElementRepository.delete(id))));
}

function* handleElementChange({ payload }: ChangeAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;
  if (element instanceof Container) {
    const children = element.ownedElements.map(ElementRepository.getById(elements)).filter(notEmpty);
    const updates = element.render(children);
    yield all(updates.map(e => put(ElementRepository.update(e.id, e))));
  }
}

function* handleElementResize({ payload }: ResizeAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (element instanceof Container) {
    const children = element.ownedElements.map(ElementRepository.getById(elements)).filter(notEmpty);
    const updates = element.resizeElement(children);
    yield all(updates.map(e => put(ElementRepository.update(e.id, e))));
  }
}
