import { all, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { Connection } from '../../services/relationship/connection';
import { Boundary, computeBoundingBoxForRelationship } from '../../utils/geometry/boundary';
import { Point } from '../../utils/geometry/point';
import { notEmpty } from '../../utils/not-empty';
import { Element } from '../element/element';
import { ElementRepository } from '../element/element-repository';
import { DeleteAction, ElementActionTypes, MoveAction, ResizeAction, UpdateAction } from '../element/element-types';
import { Relationship } from './relationship';
import { RelationshipRepository } from './relationship-repository';
import { ConnectAction, CreateAction, FlipAction, RedrawAction, RelationshipActionTypes } from './relationship-types';

export function* RelationshipSaga() {
  yield takeEvery(RelationshipActionTypes.CREATE, handleRelationshipCreation);
  yield takeEvery(RelationshipActionTypes.CONNECT, handleRelationshipConnect);
  yield takeEvery(RelationshipActionTypes.FLIP, handleRelationshipFlip);
  yield takeEvery(ElementActionTypes.MOVE, handleElementMove);
  yield takeEvery(ElementActionTypes.RESIZE, handleElementResize);
  yield takeLatest(ElementActionTypes.UPDATE, handleElementUpdate);
  yield takeLatest(ElementActionTypes.DELETE, handleElementDelete);
}

function* handleRelationshipCreation(action: CreateAction) {
  const { payload } = action;
  yield recalc(payload.relationship.id);
}

function* handleRelationshipConnect(action: ConnectAction) {
  const { payload } = action;
  yield recalc(payload.id);
}

function* handleRelationshipFlip(action: FlipAction) {
  const { payload } = action;
  yield recalc(payload.id);
}

function* handleElementMove(action: MoveAction) {
  const { payload } = action;
  if (!payload.id) return;

  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (!element) return;

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

function* handleElementResize(action: ResizeAction) {
  const { payload } = action;
  const { elements }: ModelState = yield select();
  const element = ElementRepository.getById(elements)(payload.id);
  if (!element || !(element.constructor as typeof Element).features.connectable) return;

  const relationships = RelationshipRepository.read(elements);

  for (const relationship of relationships) {
    if (relationship.source.element === element.id) {
      yield recalc(relationship.id);
    } else if (relationship.target.element === element.id) {
      yield recalc(relationship.id);
    }
  }
}

function* handleElementUpdate(action: UpdateAction) {
  const { payload } = action;
  const { elements }: ModelState = yield select();
  const relationship = RelationshipRepository.getById(elements)(payload.id);
  if (relationship instanceof Relationship) {
    yield recalc(relationship.id);
  }
}

function* recalc(id: string) {
  const { elements }: ModelState = yield select();
  const relationship = RelationshipRepository.getById(elements)(id);
  if (!relationship) return;

  const sourcePosition = ElementRepository.getAbsolutePosition(elements)(relationship.source.element);
  const sourceBounds: Boundary = { ...elements[relationship.source.element].bounds, ...sourcePosition };

  const targetPosition = ElementRepository.getAbsolutePosition(elements)(relationship.target.element);
  const targetBounds: Boundary = { ...elements[relationship.target.element].bounds, ...targetPosition };

  const { straight } = (relationship.constructor as typeof Relationship).features;

  let path = Connection.computePath(
    { bounds: sourceBounds, direction: relationship.source.direction },
    { bounds: targetBounds, direction: relationship.target.direction },
    { isStraight: straight },
  );

  const x = Math.min(...path.map(point => point.x));
  const y = Math.min(...path.map(point => point.y));
  const width = Math.max(...path.map(point => point.x)) - x;
  const height = Math.max(...path.map(point => point.y)) - y;
  const bounds = { x, y, width, height };
  path = path.map(point => new Point(point.x - x, point.y - y));

  const copy: Relationship = relationship.clone();
  Object.assign(copy, { bounds: { ...bounds }, path: [...path] });
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

function* handleElementDelete(action: DeleteAction) {
  const { payload } = action;
  if (!payload.id) return;

  const { elements }: ModelState = yield select();
  const relationships = Object.values(elements)
    .filter(element => 'path' in element)
    .map<Relationship | null>(element => RelationshipRepository.getById(elements)(element.id))
    .filter(notEmpty)
    .filter(relationship => relationship.source.element === payload.id || relationship.target.element === payload.id);
  yield all(relationships.map(relationship => put(ElementRepository.delete(relationship.id))));
}
