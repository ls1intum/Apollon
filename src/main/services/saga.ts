import { SagaIterator } from 'redux-saga';
import { composeSaga } from '../utils/actions/sagas.js';
import { ILayer } from './layouter/layer.js';
import { Layouter } from './layouter/layouter.js';
import { UMLContainerSaga } from './uml-container/uml-container-saga.js';
import { UMLDiagramSaga } from './uml-diagram/uml-diagram-saga.js';
import { UMLElementSaga } from './uml-element/uml-element-saga.js';
import { UMLRelationshipSaga } from './uml-relationship/uml-relationship-saga.js';

export type SagaContext = {
  layer: ILayer | null;
};

export function* saga(): SagaIterator {
  yield composeSaga([Layouter, UMLElementSaga, UMLContainerSaga, UMLRelationshipSaga, UMLDiagramSaga]);
}
