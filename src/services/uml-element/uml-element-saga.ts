import { SagaIterator } from 'redux-saga';
import { put, select, take } from 'redux-saga/effects';
import { ModelState } from 'src/components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { filterRoots } from '../../utils/geometry/tree';
import { DeselectAction, InteractableActionTypes, SelectAction } from './interactable/interactable-types';

export function* UMLElementSaga() {
  yield run([makeInteractable]);
}

function* makeInteractable(): SagaIterator {
  const action: SelectAction = yield take(InteractableActionTypes.SELECT);
  const { interactive, elements }: ModelState = yield select();
  const roots = filterRoots(interactive, elements);
  const diff = interactive.filter(x => !roots.includes(x));

  yield put<DeselectAction>({
    type: InteractableActionTypes.DESELECT,
    payload: { ids: diff },
  });
}
