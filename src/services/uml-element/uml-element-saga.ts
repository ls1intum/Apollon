// import { SAGA_ACTION } from '@redux-saga/symbols';
// import { Action } from 'redux';
// import { all, put, select, takeEvery, takeLatest } from 'redux-saga/effects';
// import { ModelState } from '../../components/store/model-state';
// import { UMLContainer } from '../uml-container/uml-container';
// import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
// import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
// import { InteractableActionTypes } from './interactable/interactable-types';
// import { SelectAction as MakeInteractiveAction } from './interactable/interactable-types';
// import { UMLElement } from './uml-element';
// import { UMLElementRepository } from './uml-element-repository';
// import {
//   DeleteAction,
//   DuplicateAction,
//   MoveAction,
//   // MakeInteractiveAction,
//   UMLElementActionTypes,
//   UpdateAction,
// } from './uml-element-types';

// function isInternal<T extends Action>(action: T): boolean {
//   return SAGA_ACTION in action;
// }

// export function* UMLElementSaga() {
//   yield takeEvery(UMLElementActionTypes.DUPLICATE, handleElementDuplicate);
//   // yield takeLatest(ElementActionTypes.SELECT, handleElementSelect);
//   yield takeLatest(InteractableActionTypes.SELECT, handleElementMakeInteractive);
//   yield takeEvery(UMLElementActionTypes.MOVE, handleElementMove);
//   yield takeLatest(UMLElementActionTypes.DELETE, handleElementDelete);
// }

// function* handleElementDuplicate({ payload }: DuplicateAction) {
//   const { id, parent } = payload;
//   const { elements }: ModelState = yield select();
//   const element = UMLElementRepository.getById(elements)(id);
//   if (!element) return;

//   const clone = element.clone();
//   if (parent) {
//     clone.owner = parent;
//   } else {
//     clone.bounds.x += 30;
//     clone.bounds.y += 30;
//   }

//   let ownedElements: string[] = [];
//   if (clone instanceof UMLContainer) {
//     ownedElements = clone.ownedElements;
//     clone.ownedElements = [];
//   }

//   yield all([put(UMLElementRepository.deselect(id)), put(UMLElementRepository.create(clone))]);

//   for (const ownedElement of ownedElements) {
//     yield put(UMLElementRepository.duplicate(ownedElement, clone.id));
//   }

//   if (!parent) {
//     yield put(UMLElementRepository.select(clone.id));
//   }
// }

// function* handleElementMakeInteractive(action: MakeInteractiveAction) {
//   yield null;
//   // const { elements }: ModelState = yield select();

//   // const relationship = RelationshipRepository.getById(elements)(payload.id);
//   // if (relationship) {
//   //   // yield put<UpdateAction>(ElementRepository.update(relationship.id, { interactive: !relationship.interactive }));
//   //   return;
//   // }

//   // const current = ElementRepository.getById(elements)(payload.id);
//   // if (!current) return;

//   // const update = (id: string, interactive: boolean) => put<UpdateAction>(ElementRepository.update(id, { interactive }));

//   // let owner = current.owner;
//   // while (owner) {
//   //   const element = elements[owner];
//   //   if (element.interactive) {
//   //     yield update(element.id, false);
//   //     return;
//   //   }
//   //   owner = element.owner;
//   // }

//   // yield update(current.id, !current.interactive);

//   // if (current instanceof Container) {
//   //   const rec = (id: string): Array<ReturnType<typeof update>> => {
//   //     const child = ElementRepository.getById(elements)(id);
//   //     if (!child) return [];
//   //     if (child.interactive) {
//   //       return [update(child.id, false)];
//   //     }
//   //     if (child instanceof Container) {
//   //       return child.ownedElements.reduce<Array<ReturnType<typeof update>>>((a, o) => {
//   //         return [...a, ...rec(o)];
//   //       }, []);
//   //     }
//   //     return [];
//   //   };

//   //   const t = current.ownedElements.reduce<Array<ReturnType<typeof update>>>((a, o) => [...a, ...rec(o)], []);
//   //   yield all(t);
//   // }
// }

// function* handleElementMove({ payload }: MoveAction) {
//   if (payload.id) return;
//   const state: ModelState = yield select();
//   const diagram = UMLDiagramRepository.read(state);
//   const elements = UMLElementRepository.parse(state);

//   const getSelection = (container: UMLContainer): UMLElement[] => {
//     if (state.selected.includes(container.id)) return [container];

//     return container.ownedElements.reduce<UMLElement[]>((result, id) => {
//       const element = elements[id];
//       if (!element) return result;
//       if (state.selected.includes(element.id)) return [...result, element];
//       if (element instanceof UMLContainer) return [...result, ...getSelection(element)];
//       return result;
//     }, []);
//   };
//   yield all(getSelection(diagram).map(element => put(UMLElementRepository.move(element.id, payload.delta))));
// }

// function* handleElementDelete({ payload }: DeleteAction) {
//   if (payload.id) return;

//   const { selected, elements }: ModelState = yield select();
//   const selection = Object.values(elements).filter(
//     element => selected.includes(element.id) && element.id !== payload.id,
//   );
//   yield all(selection.map(element => put(UMLElementRepository.delete(element.id))));
// }
