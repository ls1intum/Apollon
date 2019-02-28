import { take, takeLatest, put, select } from 'redux-saga/effects';
import { State } from './../../components/Store';
import { ElementRepository, ElementActionTypes } from './../Element';
import RelationshipRepository from './repository';
import { RecalcAction, ActionTypes, CreateAction } from './types';
import { MoveAction } from '../Element/types';

function* saga() {
  yield takeLatest(ActionTypes.CREATE, handleElementCreation);
  yield takeLatest(ElementActionTypes.MOVE, handleElementMove);
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
      relationship.source.element.id === payload.id ||
      relationship.target.element.id === payload.id
    ) {
      yield recalc(relationship.id);
    }
  }
}

function* recalc(id: string) {
  const { elements }: State = yield select();
  const relationship = RelationshipRepository.getById(elements)(id);

  const source = ElementRepository.getById(elements)(
    relationship.source.element.id
  );
  const target = ElementRepository.getById(elements)(
    relationship.target.element.id
  );

  let start: { x: number; y: number } = { x: 0, y: 0 };
  let end: { x: number; y: number } = { x: 0, y: 0 };

  {
    let { x, y, width, height } = source.bounds;
    switch (relationship.source.location) {
      case 'N':
        start = { x: x + width / 2, y };
        break;
      case 'E':
        start = { x: x + width, y: y + height / 2 };
        break;
      case 'S':
        start = { x: x + width / 2, y: y + height };
        break;
      case 'W':
        start = { x, y: y + height / 2 };
        break;
    }
  }
  {
    let { x, y, width, height } = target.bounds;
    switch (relationship.target.location) {
      case 'N':
        end = { x: x + width / 2, y };
        break;
      case 'E':
        end = { x: x + width, y: y + height / 2 };
        break;
      case 'S':
        end = { x: x + width / 2, y: y + height };
        break;
      case 'W':
        end = { x, y: y + height / 2 };
        break;
    }
  }

  yield put<RecalcAction>({
    type: ActionTypes.RECALC,
    payload: { id: relationship.id, path: [start, end] },
  });
}

// const { elements }: State = yield select();
//   for (const id in elements) {
//     const relationship = RelationshipRepository.getById(elements)(id);
//     if (relationship.base !== 'Relationship') continue;
//     console.log(relationship);
//     if (
//       relationship.source.element.id === id ||
//       relationship.target.element.id === id
//     ) {
//       const source = ElementRepository.getById(elements)(
//         relationship.source.element.id
//       );
//       const target = ElementRepository.getById(elements)(
//         relationship.target.element.id
//       );
//       console.log(source, target);

//       let start: { x: number; y: number } = { x: 0, y: 0 };
//       let end: { x: number; y: number } = { x: 0, y: 0 };

//       {
//         let { x, y, width, height } = source.bounds;
//         switch (relationship.source.location) {
//           case 'N':
//             start = { x: x + width / 2, y };
//             break;
//           case 'E':
//             start = { x: x + width, y: y + height / 2 };
//             break;
//           case 'S':
//             start = { x: x + width / 2, y: y + height };
//             break;
//           case 'W':
//             start = { x, y: y + height / 2 };
//             break;
//         }
//       }
//       {
//         let { x, y, width, height } = target.bounds;
//         switch (relationship.target.location) {
//           case 'N':
//             end = { x: x + width / 2, y };
//             break;
//           case 'E':
//             end = { x: x + width, y: y + height / 2 };
//             break;
//           case 'S':
//             end = { x: x + width / 2, y: y + height };
//             break;
//           case 'W':
//             end = { x, y: y + height / 2 };
//             break;
//         }
//       }

//       yield put<RecalcAction>({
//         type: ActionTypes.RECALC,
//         payload: { id: relationship.id, path: [start, end] },
//       });
//     }
//   }

export default saga;
