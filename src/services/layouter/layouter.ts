import { SagaIterator } from 'redux-saga';
import { getContext, put, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { UMLContainerRepository } from '../uml-container/uml-container-repository';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLRelationshipRepository } from '../uml-relationship/uml-relationship-repository';
import { ILayer } from './layer';
import { LayoutAction, LayouterActionTypes } from './layouter-types';

export function* Layouter() {
  yield run([layout]);
}

function* layout(): SagaIterator {
  const action: LayoutAction = yield take(LayouterActionTypes.LAYOUT);
  const layer: ILayer = yield getContext('layer');
  const { elements, diagram }: ModelState = yield select();

  yield put(
    UMLContainerRepository.append(
      Object.values(elements)
        .filter(element => UMLElementRepository.isUMLElement(element) && !element.owner)
        .map(element => element.id),
      diagram.id,
    ),
  );
  yield put(
    UMLDiagramRepository.append(
      Object.values(elements)
        .filter(element => UMLRelationshipRepository.isUMLRelationship(element) && !element.owner)
        .map(element => element.id),
      diagram.id,
    ),
  );
}
