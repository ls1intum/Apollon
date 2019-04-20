// import { put, select, takeLatest } from 'redux-saga/effects';
// import { ModelState } from '../../components/store/model-state';
// import { UMLContainer } from '../uml-container/uml-container';
// import { ChangeOwnerAction, UMLContainerActionTypes } from '../uml-container/uml-container-types';
// import { UMLElementRepository } from '../uml-element/uml-element-repository';
// import { CreateAction as UMLElementCreateAction, DeleteAction, UMLElementActionTypes } from '../uml-element/uml-element-types';
// import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
// import { CreateAction as UMLRelationshipCreateAction, UMLRelationshipActionTypes } from '../uml-relationship/uml-relationship-types';
// import {
//   AddElementAction,
//   AddRelationshipAction,
//   DeleteElementAction,
//   DeleteRelationshipAction,
//   UMLDiagramActionTypes,
//   UpdateBoundsAction,
// } from './uml-diagram-types';

// export function* UMLDiagramSaga() {
//   yield takeLatest(UMLContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
//   yield takeLatest(UMLElementActionTypes.CREATE, handleElementCreation);
//   yield takeLatest(UMLRelationshipActionTypes.CREATE, handleRelationshipCreation);
//   yield takeLatest(UMLElementActionTypes.RESIZED, recalc);
//   yield takeLatest(UMLElementActionTypes.DELETE, handleElementDeletion);
//   yield takeLatest(UMLDiagramActionTypes.ADD_ELEMENT, recalc);
//   yield takeLatest(UMLDiagramActionTypes.ADD_RELATIONSHIP, recalc);
//   yield takeLatest(UMLDiagramActionTypes.DELETE_ELEMENT, recalc);
//   yield takeLatest(UMLDiagramActionTypes.DELETE_RELATIONSHIP, recalc);
// }

// function* handleOwnerChange({ payload }: ChangeOwnerAction) {
//   if (!payload.id || payload.id === payload.owner) return;

//   const { elements, selected }: ModelState = yield select();
//   const selection = [...selected];
//   if (selection.length > 1) {
//     yield recalc();
//     return;
//   }

//   const element = UMLElementRepository.getById(elements)(payload.id);
//   if (!element) return;

//   if (payload.owner === element.owner) {
//     yield recalc();
//     return;
//   }

//   const owner = payload.owner && UMLElementRepository.getById(elements)(payload.owner);
//   if (!owner && payload.owner && UMLRelationshipRepository.getById(elements)(payload.owner)) {
//     return;
//   }

//   if (owner && !(owner.constructor as typeof UMLContainer).features.droppable) return;

//   if (!element.owner) {
//     yield put<DeleteElementAction>({
//       type: UMLDiagramActionTypes.DELETE_ELEMENT,
//       payload: { id: element.id },
//     });
//   }

//   if (!payload.owner) {
//     yield put<AddElementAction>({
//       type: UMLDiagramActionTypes.ADD_ELEMENT,
//       payload: { id: element.id },
//     });
//   }
//   yield recalc();
// }

// function* handleRelationshipCreation({ payload }: UMLRelationshipCreateAction) {
//   yield put<AddRelationshipAction>({
//     type: UMLDiagramActionTypes.ADD_RELATIONSHIP,
//     payload: { id: payload.relationship.id },
//   });
// }

// function* handleElementCreation({ payload }: UMLElementCreateAction) {
//   if (payload.element.owner) return;
//   yield put<AddElementAction>({
//     type: UMLDiagramActionTypes.ADD_ELEMENT,
//     payload: { id: payload.element.id },
//   });
// }

// function* handleElementDeletion({ payload }: DeleteAction) {
//   if (!payload.id) return;

//   const { diagram }: ModelState = yield select();

//   if (diagram.ownedElements.includes(payload.id)) {
//     yield put<DeleteElementAction>({
//       type: UMLDiagramActionTypes.DELETE_ELEMENT,
//       payload: { id: payload.id },
//     });
//   } else if (diagram.ownedRelationships.includes(payload.id)) {
//     yield put<DeleteRelationshipAction>({
//       type: UMLDiagramActionTypes.DELETE_RELATIONSHIP,
//       payload: { id: payload.id },
//     });
//   }
// }

// function* recalc() {
//   const { elements }: ModelState = yield select();
//   const ids = Object.keys(elements).filter(id => !elements[id].owner);
//   const rootElements = UMLElementRepository.getByIds(elements)(ids);

//   let width = 0;
//   let height = 0;
//   for (const element of rootElements) {
//     width = Math.max(Math.abs(element.bounds.x), Math.abs(element.bounds.x + element.bounds.width), width);
//     height = Math.max(Math.abs(element.bounds.y), Math.abs(element.bounds.y + element.bounds.height), height);
//   }

//   const bounds = { x: -width, y: -height, width: width * 2, height: height * 2 };
//   yield put<UpdateBoundsAction>({ type: UMLDiagramActionTypes.UPDATE_BOUNDS, payload: { bounds } });
// }
