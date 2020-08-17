import { SagaIterator } from 'redux-saga';
import { call, put, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { isInternal, run } from '../../utils/actions/sagas';
import { filterRoots } from '../../utils/geometry/tree';
import { render } from '../layouter/layouter';
import { DeselectAction, InteractableActionTypes } from './interactable/interactable-types';
import { ResizeAction, ResizingActionTypes } from './resizable/resizing-types';
import { UMLElementActionTypes, UpdateAction } from './uml-element-types';

export function* UMLElementSaga() {
  yield run([makeInteractable, renderAfterUpdate, renderWhileResize]);
}

function* makeInteractable(): SagaIterator {
  yield take(InteractableActionTypes.SELECT);
  const { interactive, elements }: ModelState = yield select();
  const roots = filterRoots(interactive, elements);
  const difference = interactive.filter((x) => !roots.includes(x));

  yield put<DeselectAction>({
    type: InteractableActionTypes.DESELECT,
    payload: { ids: difference },
    undoable: false,
  });
}

function* renderAfterUpdate(): SagaIterator {
  const action: UpdateAction = yield take(UMLElementActionTypes.UPDATE);
  if (isInternal(action)) {
    return;
  }

  for (const value of action.payload.values) {
    yield call(render, value.id);
  }
}

function* renderWhileResize(): SagaIterator {
  const action: ResizeAction = yield take(ResizingActionTypes.RESIZE);
  if (isInternal(action)) {
    return;
  }

  for (const id of action.payload.ids) {
    yield call(render, id);
  }
}
