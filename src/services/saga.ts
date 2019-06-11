import { SagaIterator } from 'redux-saga';
import { composeSaga } from '../utils/actions/sagas';
import { ILayer } from './layouter/layer';
import { Layouter } from './layouter/layouter';
import { UMLContainerSaga } from './uml-container/uml-container-saga';

export type SagaContext = {
  layer: ILayer | null;
};

export function* saga(): SagaIterator {
  yield composeSaga([Layouter, UMLContainerSaga]);
}
