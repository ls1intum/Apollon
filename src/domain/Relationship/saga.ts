import { takeLatest, put, all, select } from 'redux-saga/effects';
import { State } from './../../components/Store';
import { ElementRepository, ElementActionTypes } from './../Element';
import RelationshipRepository from './repository';
import {
  RedrawAction,
  ActionTypes,
  CreateAction,
  ConnectAction,
} from './types';
import { MoveAction, DeleteAction } from '../Element/types';
import Port from '../Port';
import Relationship from '.';

function* saga() {
  yield takeLatest(ActionTypes.CREATE, handleRelationshipCreation);
  yield takeLatest(ActionTypes.CONNECT, handleRelationshipConnect);
  yield takeLatest(ElementActionTypes.MOVE, handleElementMove);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementMove);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDelete);
}

function* handleRelationshipCreation({ payload }: CreateAction) {
  yield recalc(payload.relationship.id);
}

function* handleRelationshipConnect({ payload }: ConnectAction) {
  yield recalc(payload.id);
}

function* handleElementMove({ payload }: MoveAction) {
  const { elements }: State = yield select();
  for (const id in elements) {
    const relationship = RelationshipRepository.getById(elements)(id);
    if (relationship.base !== 'Relationship') continue;
    if (
      relationship.source.element === payload.id ||
      relationship.target.element === payload.id
    ) {
      yield recalc(relationship.id);
    }
  }
}

function* recalc(id: string) {
  const { elements }: State = yield select();
  const relationship = RelationshipRepository.getById(elements)(id);

  const source = elements[relationship.source.element];
  const target = elements[relationship.target.element];

  const { point: start, offset: startOffset } = Port.position(
    source,
    relationship.source.location
  );
  const { point: end, offset: endOffset } = Port.position(
    target,
    relationship.target.location
  );
  const path = [start, startOffset, endOffset, end];

  yield put<RedrawAction>({
    type: ActionTypes.REDRAW,
    payload: { id: relationship.id, path },
  });
}

function* handleElementDelete({ payload }: DeleteAction) {
  if (!payload.id) return;

  const { elements }: State = yield select();
  const relationships = Object.values(elements)
    .filter(element => element.base === 'Relationship')
    .map<Relationship>(element =>
      RelationshipRepository.getById(elements)(element.id)
    )
    .filter(
      relationship =>
        relationship.source.element === payload.id ||
        relationship.target.element === payload.id
    );
  yield all(
    relationships.map(relationship =>
      put(ElementRepository.delete(relationship.id))
    )
  );
}

export default saga;
