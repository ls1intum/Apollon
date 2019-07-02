import { SagaIterator } from 'redux-saga';
import { put, select, take } from 'redux-saga/effects';
import { ModelState } from 'src/components/store/model-state';
import { ApollonMode } from '../../typings';
import { run } from '../../utils/actions/sagas';
import { SelectableActionTypes, SelectAction } from '../uml-element/selectable/selectable-types';
import { AppendAction, UMLDiagramActionTypes } from './uml-diagram-types';

export function* UMLDiagramSaga() {
  yield run([selectRelationship]);
}

function* selectRelationship(): SagaIterator {
  const action: SelectAction = yield take(SelectableActionTypes.SELECT);
  const { diagram, editor }: ModelState = yield select();

  if (editor.readonly || editor.mode === ApollonMode.Assessment) {
    return;
  }

  const ids = action.payload.ids.filter(id => diagram.ownedRelationships.includes(id));
  if (!ids.length) {
    return;
  }

  yield put<AppendAction>({
    type: UMLDiagramActionTypes.APPEND,
    payload: { ids },
  });
}

//   if (diagram.ownedElements.includes(payload.id)) {
//     yield put<AddElementAction>({
//       type: DiagramActionTypes.ADD_ELEMENT,
//       payload: { id: payload.id },
//     });
//   } else if (diagram.ownedRelationships.includes(payload.id)) {
//     yield put<AddRelationshipAction>({
//       type: DiagramActionTypes.ADD_RELATIONSHIP,
//       payload: { id: payload.id },
//     });
//   }
// }

// export function* DiagramSaga() {
//   yield takeLatest(ContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
//   yield takeLatest(ElementActionTypes.CREATE, handleElementCreation);
//   yield takeLatest(RelationshipActionTypes.CREATE, handleRelationshipCreation);
//   yield takeLatest(ElementActionTypes.SELECT, handleElementSelection);
//   yield takeLatest(ElementActionTypes.RESIZED, recalc);
//   yield takeLatest(ElementActionTypes.DELETE, handleElementDeletion);
//   yield takeLatest(DiagramActionTypes.ADD_ELEMENT, recalc);
//   yield takeLatest(DiagramActionTypes.ADD_RELATIONSHIP, recalc);
//   yield takeLatest(DiagramActionTypes.DELETE_ELEMENT, recalc);
//   yield takeLatest(DiagramActionTypes.DELETE_RELATIONSHIP, recalc);
// }

// function* handleOwnerChange({ payload }: ChangeOwnerAction) {
//   if (!payload.id || payload.id === payload.owner) return;

//   const { elements }: ModelState = yield select();
//   const selection = Object.values(elements).filter(e => e.selected);
//   if (selection.length > 1) {
//     yield recalc();
//     return;
//   }

//   const element = ElementRepository.getById(elements)(payload.id);
//   if (!element) return;

//   if (payload.owner === element.owner) {
//     yield recalc();
//     return;
//   }

//   const owner = payload.owner && ElementRepository.getById(elements)(payload.owner);
//   if (!owner && payload.owner && RelationshipRepository.getById(elements)(payload.owner)) {
//     return;
//   }

//   if (owner && !(owner.constructor as typeof Container).features.droppable) return;

//   if (!element.owner) {
//     yield put<DeleteElementAction>({
//       type: DiagramActionTypes.DELETE_ELEMENT,
//       payload: { id: element.id },
//     });
//   }

//   if (!payload.owner) {
//     yield put<AddElementAction>({
//       type: DiagramActionTypes.ADD_ELEMENT,
//       payload: { id: element.id },
//     });
//   }
//   yield recalc();
// }

// function* handleRelationshipCreation({ payload }: RelationshipCreateAction) {
//   yield put<AddRelationshipAction>({
//     type: DiagramActionTypes.ADD_RELATIONSHIP,
//     payload: { id: payload.relationship.id },
//   });
// }

// function* handleElementCreation({ payload }: ElementCreateAction) {
//   if (payload.element.owner) return;
//   yield put<AddElementAction>({
//     type: DiagramActionTypes.ADD_ELEMENT,
//     payload: { id: payload.element.id },
//   });
// }

// function* handleElementDeletion({ payload }: DeleteAction) {
//   if (!payload.id) return;

//   const { diagram }: ModelState = yield select();

//   if (diagram.ownedElements.includes(payload.id)) {
//     yield put<DeleteElementAction>({
//       type: DiagramActionTypes.DELETE_ELEMENT,
//       payload: { id: payload.id },
//     });
//   } else if (diagram.ownedRelationships.includes(payload.id)) {
//     yield put<DeleteRelationshipAction>({
//       type: DiagramActionTypes.DELETE_RELATIONSHIP,
//       payload: { id: payload.id },
//     });
//   }
// }

// function* recalc() {
//   const { elements }: ModelState = yield select();
//   const ids = Object.keys(elements).filter(id => !elements[id].owner);
//   const rootElements = ElementRepository.getByIds(elements)(ids);

//   let width = 0;
//   let height = 0;
//   for (const element of rootElements) {
//     width = Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), width);
//     height = Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), height);
//   }

//   const bounds = { x: -width, y: -height, width: width * 2, height: height * 2 };
//   yield put<UpdateBoundsAction>({ type: DiagramActionTypes.UPDATE_BOUNDS, payload: { bounds } });
// }
