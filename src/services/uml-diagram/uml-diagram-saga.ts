import { all, call, put, select, spawn, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { notEmpty } from '../../utils/not-empty';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { MovableActionTypes, MoveEndAction } from '../uml-element/movable/movable-types';
import { ResizableActionTypes, ResizeEndAction } from '../uml-element/resizable/resizable-types';
import { ResizeAction, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLDiagram } from './uml-diagram';

export function* UMLDiagramSaga() {
  const sagas = [append, removed, moved, resized];

  yield all(
    sagas.map(saga =>
      spawn(function*() {
        while (true) {
          try {
            yield call(saga);
          } catch (e) {
            console.log('error', e);
          }
        }
      }),
    ),
  );
}

function* append() {
  const action: AppendAction = yield take(UMLContainerActionTypes.APPEND);
  const { elements, diagram }: ModelState = yield select();

  if (diagram.id !== action.payload.owner) {
    return;
  }
  yield resize(diagram, elements);
}

function* removed() {
  const action: RemoveAction = yield take(UMLContainerActionTypes.REMOVE);
  const { elements, diagram }: ModelState = yield select();

  // if (diagram.id !== action.payload.owner) {
  //   return;
  // }
  yield resize(diagram, elements);
}

function* moved() {
  const action: MoveEndAction = yield take(MovableActionTypes.MOVE_END);
  const { elements, diagram }: ModelState = yield select();

  const render = action.payload.ids.some(id => !elements[id].owner);

  if (!render) {
    return;
  }
  yield resize(diagram, elements);
}

function* resized() {
  const action: ResizeEndAction = yield take(ResizableActionTypes.RESIZE_END);
  const { elements, diagram }: ModelState = yield select();

  const render = action.payload.ids.some(id => !elements[id].owner);

  if (!render) {
    return;
  }
  yield resize(diagram, elements);
}

function resize(diagram: IUMLDiagram, elements: UMLElementState) {
  const container = UMLDiagramRepository.get(diagram);
  if (!container) {
    return;
  }

  const ownedElements = container.ownedElements.map(id => UMLElementRepository.get(elements[id])).filter(notEmpty);
  const [update] = container.render(ownedElements);

  return put<ResizeAction>({
    type: ResizingActionTypes.RESIZE,
    payload: { ids: [update.id], delta: { width: update.bounds.width, height: update.bounds.height } },
  });
}

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
