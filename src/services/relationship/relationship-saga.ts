import { all, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { Relationships } from '../../packages/relationships';
import { Connection } from '../../services/relationship/connection';
import { Boundary, computeBoundingBoxForRelationship } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { IElement } from '../element/element';
import { ElementRepository } from '../element/element-repository';
import { DeleteAction, ElementActionTypes, MoveAction } from '../element/element-types';
import { Relationship } from './relationship';
import { RelationshipRepository } from './relationship-repository';
import { ConnectAction, CreateAction, RedrawAction, RelationshipActionTypes } from './relationship-types';

export function* RelationshipSaga() {
  yield takeLatest(RelationshipActionTypes.CREATE, handleRelationshipCreation);
  yield takeLatest(RelationshipActionTypes.CONNECT, handleRelationshipConnect);
  yield takeEvery(ElementActionTypes.MOVE, handleElementMove);
  yield takeLatest(ElementActionTypes.RESIZE, handleElementMove);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDelete);
}

function* handleRelationshipCreation({ payload }: CreateAction) {
  if (!(payload.relationship instanceof Relationship)) return;
  yield recalc(payload.relationship.id);
}

function* handleRelationshipConnect({ payload }: ConnectAction) {
  yield recalc(payload.id);
}

function* handleElementMove({ payload }: MoveAction) {
  if (!payload.id) return;

  const state: ModelState = yield select();
  const relationships = RelationshipRepository.read(state);

  loop: for (const relationship of relationships) {
    let source: string | null = relationship.source.element;
    while (source) {
      if (source === payload.id) {
        yield recalc(relationship.id);
        continue loop;
      }
      source = state.elements[source].owner;
    }
    let target: string | null = relationship.target.element;
    while (target) {
      if (target === payload.id) {
        yield recalc(relationship.id);
        continue loop;
      }
      target = state.elements[target].owner;
    }
  }
}

function* recalc(id: string) {
  const { elements }: ModelState = yield select();
  const relationship = RelationshipRepository.getById(elements)(id);
  if (!relationship) return;

  let current: IElement = elements[relationship.source.element];
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

  const { straight } = (relationship.constructor as typeof Relationship).features;

  let path = Connection.computePath(
    { bounds: source, direction: relationship.source.direction },
    { bounds: target, direction: relationship.target.direction },
    { isStraight: straight },
  );

  const x = Math.min(...path.map(point => point.x));
  const y = Math.min(...path.map(point => point.y));
  const width = Math.max(Math.max(...path.map(point => point.x)) - x, 1);
  const height = Math.max(Math.max(...path.map(point => point.y)) - y, 1);
  const bounds = { x, y, width, height };

  path = path.map(point => new Point(point.x - x, point.y - y));

  const RelationshipClass = Relationships[relationship.type];
  const copy: Relationship = new RelationshipClass({ ...relationship, bounds, path });
  let computedBounds: Boundary = yield computeBoundingBoxForRelationship(copy);
  const computedPath = copy.path.map(point => ({ x: point.x - computedBounds.x, y: point.y - computedBounds.y }));
  computedBounds = { ...computedBounds, x: bounds.x + computedBounds.x, y: bounds.y + computedBounds.y };

  yield put<RedrawAction>({
    type: RelationshipActionTypes.REDRAW,
    payload: {
      id: relationship.id,
      path: computedPath,
      bounds: computedBounds,
    },
  });
}

function* handleElementDelete({ payload }: DeleteAction) {
  if (!payload.id) return;

  const { elements }: ModelState = yield select();
  const relationships = Object.values(elements)
    .filter(element => 'path' in element)
    .map<Relationship | null>(element => RelationshipRepository.getById(elements)(element.id))
    .filter(notEmpty)
    .filter(relationship => relationship.source.element === payload.id || relationship.target.element === payload.id);
  yield all(relationships.map(relationship => put(ElementRepository.delete(relationship.id))));
}
