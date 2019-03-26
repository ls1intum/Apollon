import { takeLatest, put, select, all } from 'redux-saga/effects';
import { ModelState } from './../../components/Store';
import { ElementRepository } from '../../services/element';
import Relationship from '../Relationship';
import {
  CreateAction as ElementCreateAction,
  SelectAction,
  DeleteAction,
  ElementActionTypes,
} from '../../services/element/element-types';
import {
  ContainerActionTypes as ContainerActionTypes,
  ChangeOwnerAction,
} from '../../services/container/container-types';
import {
  AddElementAction,
  ActionTypes,
  AddRelationshipAction,
  DeleteElementAction,
  DeleteRelationshipAction,
} from './types';
import { Container } from '../../services/container/container';

function* saga() {
  yield takeLatest(ContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
  yield takeLatest(ElementActionTypes.CREATE, handleElementCreation);
  yield takeLatest(ElementActionTypes.SELECT, handleElementSelection);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDeletion);
}

function* handleOwnerChange({ payload }: ChangeOwnerAction) {
  if (!payload.id || payload.id === payload.owner) return;

  const { elements }: ModelState = yield select();
  const selection = Object.values(elements).filter(element => element.selected);
  if (selection.length > 1) return;

  const element = ElementRepository.getById(elements)(payload.id);
  if (!element || payload.owner === element.owner) return;

  const owner =
    payload.owner && ElementRepository.getById(elements)(payload.owner);
  if (owner && !(owner.constructor as typeof Container).features.droppable)
    return;

  if (!element.owner) {
    yield put<DeleteElementAction>({
      type: ActionTypes.DELETE_ELEMENT,
      payload: { id: element.id },
    });
  }

  if (!payload.owner) {
    yield put<AddElementAction>({
      type: ActionTypes.ADD_ELEMENT,
      payload: { id: element.id },
    });
  }
}

function* handleElementCreation({ payload }: ElementCreateAction) {
  if (payload.element instanceof Relationship) {
    yield put<AddRelationshipAction>({
      type: ActionTypes.ADD_RELATIONSHIP,
      payload: { id: payload.element.id },
    });
  } else {
    if (payload.element.owner) return;
    yield put<AddElementAction>({
      type: ActionTypes.ADD_ELEMENT,
      payload: { id: payload.element.id },
    });
  }
}

function* handleElementSelection({ payload }: SelectAction) {
  if (!payload.id || payload.toggle) return;

  const { diagram }: ModelState = yield select();

  if (diagram.ownedElements.includes(payload.id)) {
    yield put<AddElementAction>({
      type: ActionTypes.ADD_ELEMENT,
      payload: { id: payload.id },
    });
  } else if (diagram.ownedRelationships.includes(payload.id)) {
    yield put<AddRelationshipAction>({
      type: ActionTypes.ADD_RELATIONSHIP,
      payload: { id: payload.id },
    });
  }
}

function* handleElementDeletion({ payload }: DeleteAction) {
  if (!payload.id) return;

  const { diagram }: ModelState = yield select();

  if (diagram.ownedElements.includes(payload.id)) {
    yield put<DeleteElementAction>({
      type: ActionTypes.DELETE_ELEMENT,
      payload: { id: payload.id },
    });
  } else if (diagram.ownedRelationships.includes(payload.id)) {
    yield put<DeleteRelationshipAction>({
      type: ActionTypes.DELETE_RELATIONSHIP,
      payload: { id: payload.id },
    });
  }
}

export default saga;
