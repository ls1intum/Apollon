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

  const ids = action.payload.ids.filter((id) => diagram.ownedRelationships.includes(id));
  if (!ids.length) {
    return;
  }

  yield put<AppendRelationshipAction>({
    type: UMLDiagramActionTypes.APPEND,
    payload: { ids },
    undoable: false,
  });
}

function* resizeAfterConnectionChange(): SagaIterator {
  yield takeLatest([ConnectableActionTypes.END, ReconnectableActionTypes.END, UpdatableActionTypes.END], resize);
}

function* resize(): SagaIterator {
  const layer: ILayer = yield getContext('layer');
  const { elements, diagram }: ModelState = yield select();
  const children = [
    ...diagram.ownedElements.map((id) => UMLElementRepository.get(elements[id])),
    ...diagram.ownedRelationships.map((id) => UMLRelationshipRepository.get(elements[id])),
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
