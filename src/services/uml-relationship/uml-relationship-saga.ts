import { SagaIterator } from 'redux-saga';
import { call, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { CreateAction, UMLElementActionTypes } from '../uml-element/uml-element-types';
import { UMLRelationshipRepository } from './uml-relationship-repository';
// import { ModelState } from '../../components/store/model-state';
// import { Boundary, computeBoundingBoxForRelationship } from '../../utils/geometry/boundary';
// import { Point } from '../../utils/geometry/point';
// import { notEmpty } from '../../utils/not-empty';
// import { UMLElement } from '../uml-element/uml-element';
// import { UMLElementRepository } from '../uml-element/uml-element-repository';
// import {
//   DeleteAction,
//   MoveAction,
//   ResizeAction,
//   UMLElementActionTypes,
//   UpdateAction,
// } from '../uml-element/uml-element-types';
// import { Connection } from './connection';
// import { UMLRelationship } from './uml-relationship';
// import { UMLRelationshipRepository } from './uml-relationship-repository';
// import {
//   ConnectAction,
//   CreateAction,
//   FlipAction,
//   RedrawAction,
//   UMLRelationshipActionTypes,
// } from './uml-relationship-types';

// export function* UMLRelationshipSaga() {
//   yield takeEvery(UMLRelationshipActionTypes.CREATE, handleRelationshipCreation);
//   yield takeEvery(UMLRelationshipActionTypes.CONNECT, handleRelationshipConnect);
//   yield takeEvery(UMLRelationshipActionTypes.FLIP, handleRelationshipFlip);
//   yield takeEvery(UMLElementActionTypes.MOVE, handleElementMove);
//   yield takeEvery(UMLElementActionTypes.RESIZE, handleElementResize);
//   yield takeLatest(UMLElementActionTypes.UPDATE, handleElementUpdate);
//   yield takeLatest(UMLElementActionTypes.DELETE, handleElementDelete);
// }

export function* UMLRelationshipSaga() {
  yield run([create]);
}

function* create(): SagaIterator {
  const action: CreateAction = yield take(UMLElementActionTypes.CREATE);
  for (const value of action.payload.values) {
    yield call(recalc, value.id);
  }
}

// function* handleRelationshipConnect(action: ConnectAction) {
//   const { payload } = action;
//   yield recalc(payload.id);
// }

// function* handleRelationshipFlip(action: FlipAction) {
//   const { payload } = action;
//   yield recalc(payload.id);
// }

// function* handleElementMove(action: MoveAction) {
//   const { payload } = action;
//   if (!payload.id || payload.internal) return;

//   const { elements }: ModelState = yield select();
//   const element = UMLElementRepository.getById(elements)(payload.id);
//   if (!element) return;

//   const relationships = UMLRelationshipRepository.read(elements);

//   loop: for (const relationship of relationships) {
//     let source: string | null = relationship.source.element;
//     while (source) {
//       if (source === payload.id) {
//         yield recalc(relationship.id);
//         continue loop;
//       }
//       source = elements[source].owner;
//     }
//     let target: string | null = relationship.target.element;
//     while (target) {
//       if (target === payload.id) {
//         yield recalc(relationship.id);
//         continue loop;
//       }
//       target = elements[target].owner;
//     }
//   }
// }

// function* handleElementResize(action: ResizeAction) {
//   const { payload } = action;
//   const { elements }: ModelState = yield select();
//   const element = UMLElementRepository.getById(elements)(payload.id);
//   if (!element || !(element.constructor as typeof UMLElement).features.connectable) return;

//   const relationships = UMLRelationshipRepository.read(elements);

//   for (const relationship of relationships) {
//     if (relationship.source.element === element.id) {
//       yield recalc(relationship.id);
//     } else if (relationship.target.element === element.id) {
//       yield recalc(relationship.id);
//     }
//   }
// }

// function* handleElementUpdate(action: UpdateAction) {
//   const { payload } = action;
//   const { elements }: ModelState = yield select();
//   const relationship = UMLRelationshipRepository.getById(elements)(payload.id);
//   if (relationship instanceof UMLRelationship) {
//     yield recalc(relationship.id);
//   }
// }

function* recalc(id: string): SagaIterator {
  const { elements }: ModelState = yield select();
  const relationship = UMLRelationshipRepository.get(elements[id]);
  if (!relationship) {
    return;
  }

  console.log('redraw', relationship);

  // const sourcePosition = UMLElementRepository.getAbsolutePosition(elements)(relationship.source.element);
  // const sourceBounds: Boundary = { ...elements[relationship.source.element].bounds, ...sourcePosition };

  // const targetPosition = UMLElementRepository.getAbsolutePosition(elements)(relationship.target.element);
  // const targetBounds: Boundary = { ...elements[relationship.target.element].bounds, ...targetPosition };

  // const { straight } = (relationship.constructor as typeof UMLRelationship).features;

  // let path = Connection.computePath(
  //   { bounds: sourceBounds, direction: relationship.source.direction },
  //   { bounds: targetBounds, direction: relationship.target.direction },
  //   { isStraight: straight },
  // );

  // const x = Math.min(...path.map(point => point.x));
  // const y = Math.min(...path.map(point => point.y));
  // const width = Math.max(...path.map(point => point.x)) - x;
  // const height = Math.max(...path.map(point => point.y)) - y;
  // const bounds = { x, y, width, height };
  // path = path.map(point => new Point(point.x - x, point.y - y));

  // const copy: UMLRelationship = relationship.clone();
  // Object.assign(copy, { bounds: { ...bounds }, path: [...path] });
  // let computedBounds: Boundary = yield computeBoundingBoxForRelationship(copy);
  // const computedPath = copy.path.map(point => ({ x: point.x - computedBounds.x, y: point.y - computedBounds.y }));
  // computedBounds = { ...computedBounds, x: bounds.x + computedBounds.x, y: bounds.y + computedBounds.y };

  // yield put<RedrawAction>({
  //   type: UMLRelationshipActionTypes.REDRAW,
  //   payload: {
  //     id: relationship.id,
  //     path: computedPath,
  //     bounds: computedBounds,
  //   },
  // });
}

// function* handleElementDelete(action: DeleteAction) {
//   const { payload } = action;
//   if (!payload.id) return;

//   const { elements }: ModelState = yield select();
//   const relationships = Object.values(elements)
//     .filter(element => 'path' in element)
//     .map<UMLRelationship | null>(element => UMLRelationshipRepository.getById(elements)(element.id))
//     .filter(notEmpty)
//     .filter(relationship => relationship.source.element === payload.id || relationship.target.element === payload.id);
//   yield all(relationships.map(relationship => put(UMLElementRepository.delete(relationship.id))));
// }
