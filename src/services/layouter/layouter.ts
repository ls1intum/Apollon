import { SagaIterator } from 'redux-saga';
import { getContext, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { ILayer } from './layer';
import { LayoutAction, LayouterActionTypes } from './layouter-types';

export function* Layouter() {
  yield run([layout]);
}

function* layout(): SagaIterator {
  const action: LayoutAction = yield take(LayouterActionTypes.LAYOUT);
  const layer: ILayer = yield getContext('layer');
  const { elements }: ModelState = yield select();
}
