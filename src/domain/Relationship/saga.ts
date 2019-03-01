import { take, takeLatest, put, select } from 'redux-saga/effects';
import { State } from './../../components/Store';
import { ElementRepository, ElementActionTypes } from './../Element';
import RelationshipRepository from './repository';
import { RedrawAction, ActionTypes, CreateAction } from './types';
import { MoveAction } from '../Element/types';
import Port from '../Port';

function* saga() {
  yield takeLatest(ActionTypes.CREATE, handleElementCreation);
  yield takeLatest(ElementActionTypes.MOVE, handleElementMove);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementMove);
}

function* handleElementCreation({ payload }: CreateAction) {
  yield recalc(payload.relationship.id);
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

  const start = Port.position(source, relationship.source.location);
  const end = Port.position(target, relationship.target.location);
  const path = [start, end];

  yield put<RedrawAction>({
    type: ActionTypes.REDRAW,
    payload: { id: relationship.id, path },
  });
}

export default saga;
