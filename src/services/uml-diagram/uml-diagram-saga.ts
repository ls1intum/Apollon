import { SagaIterator } from 'redux-saga';
import { getContext, put, select, take, takeLatest } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { notEmpty } from '../../utils/not-empty';
import { ApollonMode } from '../editor/editor-types';
import { ILayer } from '../layouter/layer';
import { ConnectableActionTypes } from '../uml-element/connectable/connectable-types';
import { ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { SelectableActionTypes, SelectAction } from '../uml-element/selectable/selectable-types';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UpdatableActionTypes } from '../uml-element/updatable/updatable-types';
import { ReconnectableActionTypes } from '../uml-relationship/reconnectable/reconnectable-types';
import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
import { UMLDiagramRepository } from './uml-diagram-repository';
import { AppendRelationshipAction, UMLDiagramActionTypes } from './uml-diagram-types';

export function* UMLDiagramSaga() {
  yield run([selectRelationship, resizeAfterConnectionChange]);
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

  yield put<AppendRelationshipAction>({
    type: UMLDiagramActionTypes.APPEND,
    payload: { ids },
    undoable: false,
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

function* resizeAfterConnectionChange(): SagaIterator {
  yield takeLatest([ConnectableActionTypes.END, ReconnectableActionTypes.END, UpdatableActionTypes.END], resize);
}

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

function* resize(): SagaIterator {
  const layer: ILayer = yield getContext('layer');
  const { elements, diagram }: ModelState = yield select();
  const children = [
    ...diagram.ownedElements.map(id => UMLElementRepository.get(elements[id])),
    ...diagram.ownedRelationships.map(id => UMLRelationshipRepository.get(elements[id])),
  ].filter(notEmpty);
  const container = UMLDiagramRepository.get(diagram);

  if (!container) {
    return;
  }

  const [updates] = container.render(layer, children);

  const delta = {
    width: updates.bounds.width - diagram.bounds.width,
    height: updates.bounds.height - diagram.bounds.height,
  };

  yield put({
    type: ResizingActionTypes.RESIZE,
    payload: { ids: [diagram.id], delta },
    undoable: false,
  });
}
