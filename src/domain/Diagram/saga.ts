import { take, takeLatest, put, select } from 'redux-saga/effects';
import { State } from './../../components/Store';
import { AnyAction } from 'redux';
import { ElementActionTypes } from '../Element';
import { RelationshipActionTypes } from '../Relationship';
import {
  CreateAction as ElementCreateAction,
  SelectAction,
} from '../Element/types';
import { CreateAction as RelationshipCreateAction } from '../Relationship/types';
import { AddElementAction, ActionTypes, AddRelationshipAction } from './types';

function* saga() {
  yield takeLatest(ElementActionTypes.CREATE, handleElementCreation);
  yield takeLatest(RelationshipActionTypes.CREATE, handleRelationshipCreation);
  yield takeLatest(ElementActionTypes.SELECT, handleElementSelection);
}

function* handleElementCreation({ payload }: ElementCreateAction) {
  if (payload.element.owner) return;
  yield put<AddElementAction>({
    type: ActionTypes.ADD_ELEMENT,
    payload: { id: payload.element.id },
  });
}

function* handleRelationshipCreation({ payload }: RelationshipCreateAction) {
  yield put<AddRelationshipAction>({
    type: ActionTypes.ADD_RELATIONSHIP,
    payload: { id: payload.relationship.id },
  });
}

function* handleElementSelection({ payload }: SelectAction) {
  if (!payload.id || payload.toggle) return;

  const { diagram }: State = yield select();

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

function* handleDelete() {
  const action: AnyAction = yield take('@@element/DELETE');
  yield put({ type: '@@diagram/DELETE', id: action.payload.id });
}

export default saga;
