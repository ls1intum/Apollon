import { SagaIterator, Saga } from 'redux-saga';
import { put, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { notEmpty } from '../../utils/not-empty';
import { MovableActionTypes, MoveEndAction } from '../uml-element/movable/movable-types';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLContainerRepository } from './uml-container-repository';

export function* UMLContainerSaga() {
  const sagas: Saga[] = [append];
  yield run([append]);
}

// function* resize() {
//   const action: AppendAction = yield take(UMLContainerActionTypes.APPEND);
//   const { elements, diagram }: ModelState = yield select();

//   if (diagram.id === action.payload.owner) {
//     return;
//   }

//   const container = UMLElementRepository.get(elements[action.payload.owner]);

//   if (!container || !UMLContainerRepository.isUMLContainer(container)) {
//     return;
//   }

//   let delta = new Point(-container.bounds.x, -container.bounds.y);
//   let owner = container.owner;

//   while (owner) {
//     const parent = elements[owner];
//     delta = delta.subtract(parent.bounds.x, parent.bounds.y);
//     owner = parent.owner;
//   }

//   // yield put(UMLElementRepository.move({ ...delta }, action.payload.ids));
// }

function* append(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.MOVE_END);
  const { diagram, elements, hovered }: ModelState = yield select();

  if (!hovered.length) {
    const movedElements = action.payload.ids
      .map(id => UMLElementRepository.get(elements[id]))
      .filter(notEmpty)
      .filter(element => element.owner !== null)
      .map(element => element.id);
    yield put(UMLContainerRepository.append(movedElements));
    return;
  }

  const container = UMLElementRepository.get(elements[hovered[0]]);

  if (!container || !UMLContainerRepository.isUMLContainer(container)) {
    return;
  }

  const movedElements = action.payload.ids
    .map(id => UMLElementRepository.get(elements[id]))
    .filter(notEmpty)
    .filter(element => element.owner !== container.id)
    .map(element => element.id);

  if (!movedElements.length) {
    return;
  }

  yield put(UMLContainerRepository.append(movedElements, container.id));
}

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
