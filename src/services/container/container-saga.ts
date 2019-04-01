import { all, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { Element } from '../element/element';
import { ElementRepository } from '../element/element-repository';
import {
  ChangeAction,
  CreateAction,
  DeleteAction,
  ElementActionTypes,
  MoveAction,
  ResizeAction,
  UpdateAction,
} from '../element/element-types';
import { RelationshipRepository } from '../relationship/relationship-repository';
import { Container } from './container';
import { AppendChildAction, ChangeOwnerAction, ContainerActionTypes, RemoveChildAction } from './container-types';

export function* ContainerSaga() {
  yield takeEvery(ElementActionTypes.CREATE, appendNewElementToParent);
  yield takeEvery(ElementActionTypes.DELETE, removeElementFromParent);
  yield takeEvery(ContainerActionTypes.APPEND_CHILD, appendChild);
  yield takeEvery(ContainerActionTypes.REMOVE_CHILD, removeChild);
  yield takeEvery(ContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
  yield takeEvery(ElementActionTypes.CHANGE, handleElementChange);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementResize);
}

function* appendNewElementToParent({ payload }: CreateAction) {
  if (payload.element.owner) {
    yield put<AppendChildAction>({
      type: ContainerActionTypes.APPEND_CHILD,
      payload: { id: payload.element.id, owner: payload.element.owner },
    });
  }
}

function* removeElementFromParent({ payload }: DeleteAction) {
  const elementID = payload.id;
  if (!elementID) return;

  const { elements }: ModelState = yield select();
  const effects = [];

  const children = Object.keys(elements).filter(id => elements[id].owner === elementID);
  effects.push(...children.map(id => put(ElementRepository.delete(id))));

  const owner = ElementRepository.getByIds(elements)(Object.keys(elements)).find(
    element => element instanceof Container && element.ownedElements.includes(elementID),
  );
  if (owner) {
    effects.push(
      put<RemoveChildAction>({
        type: ContainerActionTypes.REMOVE_CHILD,
        payload: { id: elementID, owner: owner.id },
      }),
    );
  }

  yield all(effects);
}

function* appendChild({ payload }: AppendChildAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;
  const position = { x: element.bounds.x, y: element.bounds.y };
  let owner = ElementRepository.getById(elements)(payload.owner);

  while (owner) {
    position.x -= owner.bounds.x;
    position.y -= owner.bounds.y;
    if (!owner.owner) break;
    owner = ElementRepository.getById(elements)(owner.owner);
  }

  const delta = { x: position.x - element.bounds.x, y: position.y - element.bounds.y };
  yield put<MoveAction>(ElementRepository.move(element.id, delta));

  yield renderContainer(payload.owner);
}

function* removeChild({ payload }: RemoveChildAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) {
    yield renderContainer(payload.owner);
    return;
  }
  const position = { x: element.bounds.x, y: element.bounds.y };
  let owner = ElementRepository.getById(elements)(payload.owner);
  while (owner) {
    position.x += owner.bounds.x;
    position.y += owner.bounds.y;
    if (!owner.owner) break;
    owner = ElementRepository.getById(elements)(owner.owner);
  }

  const delta = { x: position.x - element.bounds.x, y: position.y - element.bounds.y };
  yield put<MoveAction>(ElementRepository.move(element.id, delta));
}

function* handleOwnerChange({ payload }: ChangeOwnerAction) {
  if (!payload.id || payload.id === payload.owner) return;

  const { elements }: ModelState = yield select();
  const selection = Object.values(elements).filter(e => e.selected);
  if (selection.length > 1) {
    if (payload.owner) {
      yield renderContainer(payload.owner);
    }
    return;
  }

  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;

  if (payload.owner && payload.owner === element.owner) {
    yield renderContainer(payload.owner);
    return;
  }

  const owner = payload.owner && ElementRepository.getById(elements)(payload.owner);

  if (!owner && payload.owner && RelationshipRepository.getById(elements)(payload.owner)) {
    return;
  }

  const current = element.owner && ElementRepository.getById(elements)(element.owner);
  if (owner && !(owner.constructor as typeof Container).features.droppable) return;

  if (current) {
    yield put<RemoveChildAction>({
      type: ContainerActionTypes.REMOVE_CHILD,
      payload: { id: element.id, owner: current.id },
    });
  }

  if (owner) {
    yield put<AppendChildAction>({
      type: ContainerActionTypes.APPEND_CHILD,
      payload: { id: element.id, owner: owner.id },
    });
  }
}

function* handleElementChange({ payload }: ChangeAction) {
  yield renderContainer(payload.id);
}

function* handleElementResize({ payload }: ResizeAction) {
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);

  const effects = [];
  if (element instanceof Container) {
    effects.push(resizeContainer(element.id));
  }

  if (element && element.owner) {
    effects.push(renderContainer(element.owner));
  }

  yield all(effects);
}

function* renderContainer(id: string) {
  const { elements }: ModelState = yield select();
  const owner = ElementRepository.getById(elements)(id);
  if (!owner || !(owner instanceof Container)) return;

  const children = ElementRepository.getByIds(elements)(owner.ownedElements);
  const updates = owner.render(children);
  yield updateElements(updates);
}

function* resizeContainer(id: string) {
  const { elements }: ModelState = yield select();
  const owner = ElementRepository.getById(elements)(id);
  if (!owner || !(owner instanceof Container)) return;

  const children = ElementRepository.getByIds(elements)(owner.ownedElements);
  const updates = owner.resize(children);
  yield updateElements(updates);
}

function* updateElements(updates: Element[]) {
  const { elements }: ModelState = yield select();

  for (const update of updates) {
    const original = ElementRepository.getById(elements)(update.id);
    if (!original) continue;
    if (update.bounds.x !== original.bounds.x || update.bounds.y !== original.bounds.y) {
      yield put<MoveAction>({
        type: ElementActionTypes.MOVE,
        payload: {
          id: original.id,
          delta: {
            x: update.bounds.x - original.bounds.x,
            y: update.bounds.y - original.bounds.y,
          },
        },
      });
    }
    if (update.bounds.width !== original.bounds.width || update.bounds.height !== original.bounds.height) {
      yield put<ResizeAction>({
        type: ElementActionTypes.RESIZE,
        payload: {
          id: original.id,
          delta: {
            width: update.bounds.width - original.bounds.width,
            height: update.bounds.height - original.bounds.height,
          },
        },
      });
    }
    const difference = diff(original, update);
    for (const key of Object.keys(difference) as Array<keyof Element>) {
      if (key === 'bounds') continue;
      yield put<UpdateAction>(ElementRepository.update(update.id, { [key]: difference[key] }));
    }
  }
}

function diff(lhs: Element, rhs: Element): Partial<Element> {
  const deletedValues = Object.keys(lhs).reduce((acc, key) => {
    return rhs.hasOwnProperty(key) ? acc : { ...acc, [key]: undefined };
  }, {});

  return (Object.keys(rhs) as Array<keyof Element>).reduce((acc, key) => {
    if (!lhs.hasOwnProperty(key)) return { ...acc, [key]: rhs[key] };
    if (lhs[key] === rhs[key]) return acc;

    return { ...acc, [key]: rhs[key] };
  }, deletedValues);
}
