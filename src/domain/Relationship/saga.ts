import { takeLatest, takeEvery, put, all, select } from 'redux-saga/effects';
import { ModelState } from './../../components/Store';
import { Element, ElementRepository, ElementActionTypes } from './../Element';
import RelationshipRepository from './repository';
import { RedrawAction, ActionTypes, ConnectAction } from './types';
import { MoveAction, DeleteAction, CreateAction } from '../Element/types';
import Port, { Connection } from '../Port';
import Relationship from '.';
import Boundary from '../geo/Boundary';

function* saga() {
  yield takeLatest(ElementActionTypes.CREATE, handleRelationshipCreation);
  yield takeLatest(ActionTypes.CONNECT, handleRelationshipConnect);
  yield takeEvery(ElementActionTypes.MOVE, handleElementMove);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementMove);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDelete);
}

function* handleRelationshipCreation({ payload }: CreateAction) {
  if (!(payload.element instanceof Relationship)) return;
  yield recalc(payload.element.id);
}

function* handleRelationshipConnect({ payload }: ConnectAction) {
  yield recalc(payload.id);
}

function* handleElementMove({ payload }: MoveAction) {
  if (!payload.id) return;

  const { elements }: ModelState = yield select();
  const relationships = RelationshipRepository.read(elements);

  loop: for (const relationship of relationships) {
    let source: string | null = relationship.source.element;
    while (source) {
      if (source === payload.id) {
        yield recalc(relationship.id);
        continue loop;
      }
      source = elements[source].owner;
    }
    let target: string | null = relationship.target.element;
    while (target) {
      if (target === payload.id) {
        yield recalc(relationship.id);
        continue loop;
      }
      target = elements[target].owner;
    }
  }
}

function* recalc(id: string) {
  const { elements }: ModelState = yield select();
  const relationship = RelationshipRepository.getById(elements)(id);

  let current: Element = elements[relationship.source.element];
  let source: Boundary = { ...current.bounds };
  while (current.owner) {
    current = elements[current.owner];
    source = {
      ...source,
      x: source.x + current.bounds.x,
      y: source.y + current.bounds.y,
    };
  }

  current = elements[relationship.target.element];
  let target: Boundary = { ...current.bounds };
  while (current.owner) {
    current = elements[current.owner];
    target = {
      ...target,
      x: target.x + current.bounds.x,
      y: target.y + current.bounds.y,
    };
  }

  const {
    straight,
  } = (relationship.constructor as typeof Relationship).features;

  let path = Connection.computePath(
    { bounds: source, direction: relationship.source.direction },
    { bounds: target, direction: relationship.target.direction },
    { isStraight: straight }
  );

  const x = Math.min(...path.map(point => point.x));
  const y = Math.min(...path.map(point => point.y));
  const width = Math.max(Math.max(...path.map(point => point.x)) - x, 1);
  const height = Math.max(Math.max(...path.map(point => point.y)) - y, 1);
  const bounds = { x, y, width, height };

  path = path.map(point => ({ x: point.x - x, y: point.y - y }));

  yield put<RedrawAction>({
    type: ActionTypes.REDRAW,
    payload: { id: relationship.id, path, bounds },
  });
}

function* handleElementDelete({ payload }: DeleteAction) {
  if (!payload.id) return;

  const { elements }: ModelState = yield select();
  const relationships = Object.values(elements)
    .filter(element => 'path' in element)
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
