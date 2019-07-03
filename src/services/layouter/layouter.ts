import { SagaIterator } from 'redux-saga';
import { getContext, put, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { UMLContainerRepository } from '../uml-container/uml-container-repository';
import { ILayer } from './layer';
import { LayoutAction, LayouterActionTypes } from './layouter-types';

export function* Layouter() {
  yield run([layout]);
}

function* layout(): SagaIterator {
  const action: LayoutAction = yield take(LayouterActionTypes.LAYOUT);
  const layer: ILayer = yield getContext('layer');
  const { elements, diagram }: ModelState = yield select();
  const ids = Object.values(elements)
    .filter(x => !x.owner)
    .map(x => x.id);

  if (!ids.length) {
    return;
  }

  yield put(UMLContainerRepository.append(ids));
}
