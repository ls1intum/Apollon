import { SagaIterator } from 'redux-saga';
import { composeSaga } from '../utils/actions/sagas';
import { ILayer } from './layouter/layer';
import { Layouter } from './layouter/layouter';
import { UMLContainerSaga } from './uml-container/uml-container-saga';
import { UMLDiagramSaga } from './uml-diagram/uml-diagram-saga';
import { UMLRelationshipSaga } from './uml-relationship/uml-relationship-saga';

export type SagaContext = {
  layer: ILayer | null;
};

export function* saga(): SagaIterator {
  yield composeSaga([Layouter, UMLDiagramSaga, UMLContainerSaga, UMLRelationshipSaga]);
}
