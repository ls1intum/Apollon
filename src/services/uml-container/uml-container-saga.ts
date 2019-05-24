import { all, call, select, spawn, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLContainerRepository } from './uml-container-repository';
// import { ModelState } from '../../components/store/model-state';
// import { Point } from '../../utils/geometry/point';
// import { UMLElement } from '../uml-element/uml-element';
// import { UMLElementRepository } from '../uml-element/uml-element-repository';
// import {
//   ChangeAction,
//   CreateAction,
//   DeleteAction,
//   MoveAction,
//   ResizeAction,
//   UMLElementActionTypes,
//   UpdateAction,
// } from '../uml-element/uml-element-types';
// import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
// import { UMLContainer } from './uml-container';
import { AppendAction, UMLContainerActionTypes } from './uml-container-types';

export function* UMLContainerSaga() {
  yield null;
  // const sagas = [append];

  // yield all(
  //   sagas.map(saga =>
  //     spawn(function*() {
  //       while (true) {
  //         try {
  //           yield call(saga);
  //         } catch (e) {
  //           console.log('error', e);
  //         }
  //       }
  //     }),
  //   ),
  // );
  // yield all([spawn(append)]);
  //   yield takeLatest(UMLElementActionTypes.CREATE, appendNewElementToParent);
  //   yield takeLatest(UMLElementActionTypes.DELETE, removeElementFromParent);
  //   yield takeLatest(UMLContainerActionTypes.REMOVE_CHILD, removeChild);
  //   yield takeLatest(UMLContainerActionTypes.CHANGE_OWNER, handleOwnerChange);
  //   yield takeLatest(UMLElementActionTypes.CHANGE, handleElementChange);
  //   yield takeLatest(UMLElementActionTypes.RESIZE, handleElementResize);
  // yield null;
}

function* append() {
  const action: AppendAction = yield take(UMLContainerActionTypes.APPEND);
  const { elements, diagram }: ModelState = yield select();

  const container =
    diagram.id === action.payload.owner
      ? UMLDiagramRepository.get(diagram)
      : UMLElementRepository.get(elements[action.payload.owner]);

  console.log('action', action, container, UMLContainerRepository.isUMLContainer(container!));
  if (!container || !UMLContainerRepository.isUMLContainer(container)) {
    return;
  }

  console.log('action', action, container);
}

// function* appendNewElementToParent({ payload }: CreateAction) {
//   if (payload.element.owner) {
//     yield put<AppendChildAction>({
//       type: UMLContainerActionTypes.APPEND_CHILD,
//       payload: { id: payload.element.id, owner: payload.element.owner },
//     });
//   }
// }

// function* removeElementFromParent({ payload }: DeleteAction) {
//   const elementID = payload.id;
//   if (!elementID) return;

//   const { elements }: ModelState = yield select();
//   const effects = [];

//   // const children = Object.keys(elements).filter(id => elements[id].owner === elementID);
//   const children = [] as string[];
//   effects.push(...children.map(id => put(UMLElementRepository.delete(id))));

//   const owner = UMLElementRepository.getByIds(elements)(Object.keys(elements)).find(
//     element => element instanceof UMLContainer && element.ownedElements.includes(elementID),
//   );
//   if (owner) {
//     effects.push(
//       put<RemoveChildAction>({
//         type: UMLContainerActionTypes.REMOVE_CHILD,
//         payload: { id: elementID, owner: owner.id },
//       }),
//     );
//   }

//   yield all(effects);
// }

// function* appendChild(action: AppendChildAction) {
//   const { payload } = action;
//   const state: ModelState = yield select();
//   const { elements } = state;

//   const element = UMLElementRepository.getById(elements)(payload.id);
//   if (!element) return;

//   yield all(renderContainer(state, payload.owner));
// }

// function* removeChild({ payload }: RemoveChildAction) {
//   const state: ModelState = yield select();
//   const { elements } = state;

//   const element = UMLElementRepository.getById(elements)(payload.id);
//   if (element) return;

//   yield all(renderContainer(state, payload.owner));
// }

// function* handleOwnerChange({ payload }: ChangeOwnerAction) {
//   if (!payload.id || payload.id === payload.owner) return;

//   const state: ModelState = yield select();
//   const { elements, selected } = state;
//   const selection = [...selected];
//   if (selection.length > 1) {
//     if (payload.owner) {
//       yield all(renderContainer(state, payload.owner));
//     }
//     return;
//   }

//   const element = UMLElementRepository.getById(elements)(payload.id);
//   if (!element) return;

//   if (payload.owner && payload.owner === element.owner) {
//     yield all(renderContainer(state, payload.owner));
//     return;
//   }

//   const owner = payload.owner && UMLElementRepository.getById(elements)(payload.owner);

//   if (!owner && payload.owner && UMLRelationshipRepository.getById(elements)(payload.owner)) {
//     return;
//   }

//   const current = element.owner && UMLElementRepository.getById(elements)(element.owner);
//   if (owner && !(owner.constructor as typeof UMLContainer).features.droppable) return;

//   let position = new Point(element.bounds.x, element.bounds.y);

//   let effects: Effect[] = [];
//   if (current) {
//     position = UMLElementRepository.getAbsolutePosition(elements)(element.id);

//     effects = [
//       ...effects,
//       put<RemoveChildAction>({
//         type: UMLContainerActionTypes.REMOVE_CHILD,
//         payload: { id: element.id, owner: current.id },
//       }),
//     ];
//   }

//   if (owner) {
//     position = UMLElementRepository.getRelativePosition(elements)(owner.id, position);
//     effects = [
//       ...effects,
//       put<AppendChildAction>({
//         type: UMLContainerActionTypes.APPEND_CHILD,
//         payload: { id: element.id, owner: owner.id },
//       }),
//     ];
//   }

//   effects = [
//     put<MoveAction>(
//       UMLElementRepository.move(element.id, { x: position.x - element.bounds.x, y: position.y - element.bounds.y }, true),
//     ),
//     ...effects,
//   ];

//   yield all(effects);
// }

// function* handleElementChange({ payload }: ChangeAction) {
//   const state: ModelState = yield select();
//   yield all(renderContainer(state, payload.id));
// }

// function* handleElementResize({ payload }: ResizeAction) {
//   const state: ModelState = yield select();
//   const { elements } = state;
//   const element = UMLElementRepository.getById(elements)(payload.id);

//   let effects: Effect[] = [];
//   if (element instanceof UMLContainer) {
//     effects = [...effects, ...resizeContainer(state, element.id)];
//   }

//   if (element && element.owner) {
//     effects = [...effects, ...renderContainer(state, element.owner)];
//   }

//   yield all(effects);
// }

// function renderContainer(state: ModelState, id: string): Effect[] {
//   const { elements } = state;
//   const owner = UMLElementRepository.getById(elements)(id);
//   if (!owner || !(owner instanceof UMLContainer)) return [];

//   const children = UMLElementRepository.getByIds(elements)(owner.ownedElements);
//   const updates = owner.render(children);
//   return updateElements(state, updates);
// }

// function resizeContainer(state: ModelState, id: string): Effect[] {
//   const { elements } = state;
//   const owner = UMLElementRepository.getById(elements)(id);
//   if (!owner || !(owner instanceof UMLContainer)) return [];

//   const children = UMLElementRepository.getByIds(elements)(owner.ownedElements);
//   const updates = owner.resize(children);
//   return updateElements(state, updates);
// }

// function updateElements(state: ModelState, updates: UMLElement[]): Effect[] {
//   const { elements } = state;
//   const effects: Effect[] = [];

//   for (const update of updates) {
//     const original = UMLElementRepository.getById(elements)(update.id);
//     if (!original) continue;
//     if (update.bounds.x !== original.bounds.x || update.bounds.y !== original.bounds.y) {
//       effects.push(
//         put<MoveAction>({
//           type: UMLElementActionTypes.MOVE,
//           payload: {
//             id: original.id,
//             delta: {
//               x: update.bounds.x - original.bounds.x,
//               y: update.bounds.y - original.bounds.y,
//             },
//             internal: true,
//           },
//         }),
//       );
//     }
//     if (update.bounds.width !== original.bounds.width || update.bounds.height !== original.bounds.height) {
//       effects.push(
//         put<ResizeAction>({
//           type: UMLElementActionTypes.RESIZE,
//           payload: {
//             id: original.id,
//             delta: {
//               width: update.bounds.width - original.bounds.width,
//               height: update.bounds.height - original.bounds.height,
//             },
//           },
//         }),
//       );
//     }
//     const difference = diff(original, update);
//     for (const key of Object.keys(difference) as Array<keyof UMLElement>) {
//       if (key === 'bounds') continue;
//       effects.push(put<UpdateAction>(UMLElementRepository.update(update.id, { [key]: difference[key] })));
//     }
//   }
//   return effects;
// }

// function diff(lhs: UMLElement, rhs: UMLElement): Partial<UMLElement> {
//   const deletedValues = Object.keys(lhs).reduce((acc, key) => {
//     return rhs.hasOwnProperty(key) ? acc : { ...acc, [key]: undefined };
//   }, {});

//   return (Object.keys(rhs) as Array<keyof UMLElement>).reduce((acc, key) => {
//     if (!lhs.hasOwnProperty(key)) return { ...acc, [key]: rhs[key] };
//     if (lhs[key] === rhs[key]) return acc;

//     return { ...acc, [key]: rhs[key] };
//   }, deletedValues);
// }
