import { put, select, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { Container } from '../container/container';
import { ChangeOwnerAction, ContainerActionTypes } from '../container/container-types';
import { ElementRepository } from '../element/element-repository';
import { CreateAction as ElementCreateAction, DeleteAction, ElementActionTypes, SelectAction } from '../element/element-types';
import { RelationshipRepository } from '../relationship/relationship-repository';
import { CreateAction as RelationshipCreateAction, RelationshipActionTypes } from '../relationship/relationship-types';
import {
  AddElementAction,
  AddRelationshipAction,
  DeleteElementAction,
  DeleteRelationshipAction,
  DiagramActionTypes,
  UpdateBoundsAction,
} from './diagram-types';

export function* DiagramSaga() {
  yield takeLatest(ContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
  yield takeLatest(ElementActionTypes.CREATE, handleElementCreation);
  yield takeLatest(RelationshipActionTypes.CREATE, handleRelationshipCreation);
  yield takeLatest(ElementActionTypes.SELECT, handleElementSelection);
  yield takeLatest(ElementActionTypes.RESIZED, recalc);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDeletion);
  yield takeLatest(DiagramActionTypes.ADD_ELEMENT, recalc);
  yield takeLatest(DiagramActionTypes.ADD_RELATIONSHIP, recalc);
  yield takeLatest(DiagramActionTypes.DELETE_ELEMENT, recalc);
  yield takeLatest(DiagramActionTypes.DELETE_RELATIONSHIP, recalc);
}

function* handleOwnerChange({ payload }: ChangeOwnerAction) {
  if (!payload.id || payload.id === payload.owner) return;

  const { elements }: ModelState = yield select();
  const selection = Object.values(elements).filter(e => e.selected);
  if (selection.length > 1) {
    yield recalc();
    return;
  }

  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;

  if (payload.owner === element.owner) {
    yield recalc();
    return;
  }

  const owner = payload.owner && ElementRepository.getById(elements)(payload.owner);
  if (!owner && payload.owner && RelationshipRepository.getById(elements)(payload.owner)) {
    return;
  }

  if (owner && !(owner.constructor as typeof Container).features.droppable) return;

  if (!element.owner) {
    yield put<DeleteElementAction>({
      type: DiagramActionTypes.DELETE_ELEMENT,
      payload: { id: element.id },
    });
  }

  if (!payload.owner) {
    yield put<AddElementAction>({
      type: DiagramActionTypes.ADD_ELEMENT,
      payload: { id: element.id },
    });
  }
  yield recalc();
}

function* handleRelationshipCreation({ payload }: RelationshipCreateAction) {
  yield put<AddRelationshipAction>({
    type: DiagramActionTypes.ADD_RELATIONSHIP,
    payload: { id: payload.relationship.id },
  });
}

function* handleElementCreation({ payload }: ElementCreateAction) {
  if (payload.element.owner) return;
  yield put<AddElementAction>({
    type: DiagramActionTypes.ADD_ELEMENT,
    payload: { id: payload.element.id },
  });
}

function* handleElementSelection({ payload }: SelectAction) {
  if (!payload.id || payload.toggle) return;

  const { diagram }: ModelState = yield select();

  if (diagram.ownedElements.includes(payload.id)) {
    yield put<AddElementAction>({
      type: DiagramActionTypes.ADD_ELEMENT,
      payload: { id: payload.id },
    });
  } else if (diagram.ownedRelationships.includes(payload.id)) {
    yield put<AddRelationshipAction>({
      type: DiagramActionTypes.ADD_RELATIONSHIP,
      payload: { id: payload.id },
    });
  }
}

function* handleElementDeletion({ payload }: DeleteAction) {
  if (!payload.id) return;

  const { diagram }: ModelState = yield select();

  if (diagram.ownedElements.includes(payload.id)) {
    yield put<DeleteElementAction>({
      type: DiagramActionTypes.DELETE_ELEMENT,
      payload: { id: payload.id },
    });
  } else if (diagram.ownedRelationships.includes(payload.id)) {
    yield put<DeleteRelationshipAction>({
      type: DiagramActionTypes.DELETE_RELATIONSHIP,
      payload: { id: payload.id },
    });
  }
}

function* recalc() {
  const { elements }: ModelState = yield select();
  const ids = Object.keys(elements).filter(id => !elements[id].owner);
  const rootElements = ElementRepository.getByIds(elements)(ids);

  let width = 0;
  let height = 0;
  for (const element of rootElements) {
    width = Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), width);
    height = Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), height);
  }

  const bounds = { x: -width, y: -height, width: width * 2, height: height * 2 };
  yield put<UpdateBoundsAction>({ type: DiagramActionTypes.UPDATE_BOUNDS, payload: { bounds } });
}
