import { call, debounce, delay, put, select, take } from 'redux-saga/effects';
import { SagaIterator } from 'redux-saga';

import { run } from '../../utils/actions/sagas';
import { PatcherActionTypes } from './patcher-types';
import { ModelState } from '../../components/store/model-state';
import { UMLContainerRepository } from '../uml-container/uml-container-repository';
import { UMLElement } from '../uml-element/uml-element';
import { UMLRelationship } from '../uml-relationship/uml-relationship';
import { recalc } from '../uml-relationship/uml-relationship-saga';
import { render } from '../layouter/layouter';

/**
 * Fixes the layout of the diagram after importing a patch.
 */
export function* PatchLayouter(): SagaIterator {
  yield run([patchLayout]);
}

export function* patchLayout(): SagaIterator {
  yield debounce(100, PatcherActionTypes.PATCH, recalculateLayouts);
}

function* recalculateLayouts(): SagaIterator {
  const { elements }: ModelState = yield select();

  const ids = Object.values(elements)
    .filter((x) => !x.owner)
    .map((x) => x.id);

  if (!ids.length) {
    return;
  }

  yield put(UMLContainerRepository.append(ids));

  for (const id of Object.keys(elements)) {
    yield delay(0);
    if (UMLElement.isUMLElement(elements[id])) {
      yield call(render, id);
    }

    if (UMLRelationship.isUMLRelationship(elements[id]) && !elements[id].isManuallyLayouted) {
      yield call(recalc, id);
    }
  }
}
