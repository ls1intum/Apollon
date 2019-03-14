import { takeLatest, all, put, select } from 'redux-saga/effects';
import { State } from './../../components/Store';
import Container from './Container';
import { ElementRepository, ElementActionTypes } from '../Element';
import {
  ResizeAction,
  DeleteAction,
  CreateAction,
  MoveAction,
} from '../Element/types';
import {
  ActionTypes,
  ChangeOwnerAction,
  AppendChildAction,
  RemoveChildAction,
} from './types';

function* saga() {
  yield takeLatest(ActionTypes.CHANGE_OWNER, handleOwnerChange);
  yield takeLatest(ElementActionTypes.CREATE, handleElementCreation);
  yield takeLatest(ElementActionTypes.CREATE, handleChildAdd);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementResize);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDelete);
}

function* handleOwnerChange({ payload }: ChangeOwnerAction) {
  // const { elements }: State = yield select();
  // const element = ElementRepository.getById(elements)(payload.id);
  // const owner = payload.owner && ElementRepository.getById(elements)(payload.owner);
  // if (owner && !(owner.constructor as any).isDroppable) return;

  // if (element.owner) {
  //   yield put<RemoveChildAction>({
  //     type: ActionTypes.REMOVE_CHILD,
  //     payload: { id: element.id, owner: element.owner },
  //   });

  //   let ownerID: string | null = element.owner;
  //   let position = { x: 0, y: 0 };
  //   while (ownerID) {
  //     const owner = ElementRepository.getById(elements)(ownerID);
  //     position.x += owner.bounds.x;
  //     position.y += owner.bounds.y;
  //     ownerID = owner.owner;
  //   }

  //   yield put<MoveAction>(ElementRepository.move(element.id, position));
  // }

  // if (payload.owner) {
  //   yield put<AppendChildAction>({
  //     type: ActionTypes.APPEND_CHILD,
  //     payload: { id: element.id, owner: payload.owner },
  //   });
  //   let ownerID: string | null = payload.owner;
  //   let position = { x: 0, y: 0 };
  //   while (ownerID) {
  //     const owner = ElementRepository.getById(elements)(ownerID);
  //     position.x -= owner.bounds.x;
  //     position.y -= owner.bounds.y;
  //     ownerID = owner.owner;
  //   }

  //   yield put<MoveAction>(ElementRepository.move(element.id, position));
  // }
  yield null;
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

function* handleElementDelete({ payload }: DeleteAction) {
  const elementId = payload.id;
  if (!elementId) return;

  const { elements }: State = yield select();
  const children = Object.keys(elements).filter(
    id => elements[id].owner === elementId
  );
  yield all(children.map(id => put(ElementRepository.delete(id))));

  const parent = Object.keys(elements)
    .filter(id => elements[id].base === 'Container')
    .map<Container>(id => ElementRepository.getById(elements)(id) as Container)
    .find(element => element.ownedElements.includes(elementId));

  if (parent) {
    const children = parent.ownedElements
      .filter(id => id !== payload.id)
      .map(ElementRepository.getById(elements));

    const updates = parent.removeElement(elementId, children);
    yield all(updates.map(element => put(ElementRepository.update(element))));
  }
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
