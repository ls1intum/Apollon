import { all, Effect, put, select, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { Point } from '../../utils/geometry/point';
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
  yield takeLatest(ElementActionTypes.CREATE, appendNewElementToParent);
  yield takeLatest(ElementActionTypes.DELETE, removeElementFromParent);
  yield takeLatest(ContainerActionTypes.APPEND_CHILD, appendChild);
  yield takeLatest(ContainerActionTypes.REMOVE_CHILD, removeChild);
  yield takeLatest(ContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
  yield takeLatest(ElementActionTypes.CHANGE, handleElementChange);
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

function* appendChild(action: AppendChildAction) {
  const { payload } = action;
  const state: ModelState = yield select();
  const { elements } = state;

  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;

  yield all(renderContainer(state, payload.owner));
}

function* removeChild({ payload }: RemoveChildAction) {
  const state: ModelState = yield select();
  const { elements } = state;

  const element = ElementRepository.getById(elements)(payload.id);
  if (element) return;

  yield all(renderContainer(state, payload.owner));
}

function* handleOwnerChange({ payload }: ChangeOwnerAction) {
  if (!payload.id || payload.id === payload.owner) return;

  const state: ModelState = yield select();
  const { elements } = state;
  const selection = Object.values(elements).filter(e => e.selected);
  if (selection.length > 1) {
    if (payload.owner) {
      yield all(renderContainer(state, payload.owner));
    }
    return;
  }

  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;

  if (payload.owner && payload.owner === element.owner) {
    yield all(renderContainer(state, payload.owner));
    return;
  }

  const owner = payload.owner && ElementRepository.getById(elements)(payload.owner);

  if (!owner && payload.owner && RelationshipRepository.getById(elements)(payload.owner)) {
    return;
  }

  const current = element.owner && ElementRepository.getById(elements)(element.owner);
  if (owner && !(owner.constructor as typeof Container).features.droppable) return;

  let position = new Point(element.bounds.x, element.bounds.y);

  let effects: Effect[] = [];
  if (current) {
    position = ElementRepository.getAbsolutePosition(elements)(element.id);

    effects = [
      ...effects,
      put<RemoveChildAction>({
        type: ContainerActionTypes.REMOVE_CHILD,
        payload: { id: element.id, owner: current.id },
      }),
    ];
  }

  if (owner) {
    position = ElementRepository.getRelativePosition(elements)(owner.id, position);
    effects = [
      ...effects,
      put<AppendChildAction>({
        type: ContainerActionTypes.APPEND_CHILD,
        payload: { id: element.id, owner: owner.id },
      }),
    ];
  }

  effects = [
    put<MoveAction>(
      ElementRepository.move(element.id, { x: position.x - element.bounds.x, y: position.y - element.bounds.y }, true),
    ),
    ...effects,
  ];

  yield all(effects);
}

function* handleElementChange({ payload }: ChangeAction) {
  const state: ModelState = yield select();
  yield all(renderContainer(state, payload.id));
}

function* handleElementResize({ payload }: ResizeAction) {
  const state: ModelState = yield select();
  const { elements } = state;
  const element = ElementRepository.getById(elements)(payload.id);

  let effects: Effect[] = [];
  if (element instanceof Container) {
    effects = [...effects, ...resizeContainer(state, element.id)];
  }

  if (element && element.owner) {
    effects = [...effects, ...renderContainer(state, element.owner)];
  }

  yield all(effects);
}

function renderContainer(state: ModelState, id: string): Effect[] {
  const { elements } = state;
  const owner = ElementRepository.getById(elements)(id);
  if (!owner || !(owner instanceof Container)) return [];

  const children = ElementRepository.getByIds(elements)(owner.ownedElements);
  const updates = owner.render(children);
  return updateElements(state, updates);
}

function resizeContainer(state: ModelState, id: string): Effect[] {
  const { elements } = state;
  const owner = ElementRepository.getById(elements)(id);
  if (!owner || !(owner instanceof Container)) return [];

  const children = ElementRepository.getByIds(elements)(owner.ownedElements);
  const updates = owner.resize(children);
  return updateElements(state, updates);
}

function updateElements(state: ModelState, updates: Element[]): Effect[] {
  const { elements } = state;
  const effects: Effect[] = [];

  for (const update of updates) {
    const original = ElementRepository.getById(elements)(update.id);
    if (!original) continue;
    if (update.bounds.x !== original.bounds.x || update.bounds.y !== original.bounds.y) {
      effects.push(
        put<MoveAction>({
          type: ElementActionTypes.MOVE,
          payload: {
            id: original.id,
            delta: {
              x: update.bounds.x - original.bounds.x,
              y: update.bounds.y - original.bounds.y,
            },
            internal: true,
          },
        }),
      );
    }
    if (update.bounds.width !== original.bounds.width || update.bounds.height !== original.bounds.height) {
      effects.push(
        put<ResizeAction>({
          type: ElementActionTypes.RESIZE,
          payload: {
            id: original.id,
            size: {
              width: update.bounds.width,
              height: update.bounds.height,
            },
          },
        }),
      );
    }
    const difference = diff(original, update);
    for (const key of Object.keys(difference) as Array<keyof Element>) {
      if (key === 'bounds') continue;
      effects.push(put<UpdateAction>(ElementRepository.update(update.id, { [key]: difference[key] })));
    }
  }
  return effects;
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
