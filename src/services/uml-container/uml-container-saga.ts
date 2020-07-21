import { SagaIterator } from 'redux-saga';
import { call, delay, getContext, put, race, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { UMLElementType } from '../../packages/uml-element-type';
import { UMLElements } from '../../packages/uml-elements';
import { run } from '../../utils/actions/sagas';
import { ILayer } from '../layouter/layer';
import { render } from '../layouter/layouter';
import { MovableActionTypes, MoveEndAction } from '../uml-element/movable/movable-types';
import { UMLElementState } from '../uml-element/uml-element-types';
import { UMLContainer } from './uml-container';
import { UMLContainerRepository } from './uml-container-repository';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from './uml-container-types';

export function* UMLContainerSaga(): SagaIterator {
  yield run([append, remove, appendAfterMove, renderAfterMove]);
}

function* append(): SagaIterator {
  const action: AppendAction = yield take(UMLContainerActionTypes.APPEND);
  const { elements, diagram }: ModelState = yield select();
  const state: UMLElementState = { ...elements, [diagram.id]: diagram };
  const container = UMLContainerRepository.get(state[action.payload.owner]);

  if (!container) {
    return;
  }

  yield call(render, container.id);
}

function* remove(): SagaIterator {
  const action: RemoveAction = yield take(UMLContainerActionTypes.REMOVE);
  const layer: ILayer = yield getContext('layer');
  const { elements, diagram }: ModelState = yield select();
  const state: UMLElementState = { ...elements, [diagram.id]: diagram };
  const owners = [
    ...new Set(action.payload.ids.filter((id) => id in state).map((id) => state[id].owner || diagram.id)),
  ];

  for (const owner of owners) {
    yield call(render, owner);
  }
}

function* appendAfterMove(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.END);
  const { elements, hovered }: ModelState = yield select();
  let containerID: string | null = null;

  if (hovered.length) {
    const container = elements[hovered[0]];
    if (
      !container ||
      !UMLContainer.isUMLContainer(container) ||
      !UMLElements[container.type as UMLElementType].features.droppable
    ) {
      return;
    }

    containerID = container.id;
  }

  const movedElements = action.payload.ids.filter((id) => elements[id].owner !== containerID && id !== containerID);
  if (!movedElements.length || action.payload.keyboard) {
    return;
  }

  yield put(UMLContainerRepository.remove(movedElements));
  yield put(UMLContainerRepository.append(movedElements, containerID || undefined));
}

function* renderAfterMove(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.END);
  const { elements, diagram }: ModelState = yield select();

  const state: UMLElementState = { ...elements, [diagram.id]: diagram };

  yield race({
    append: take(UMLContainerActionTypes.APPEND),
    resize: call(function* () {
      yield delay(0);

      const owners = [...new Set(action.payload.ids.map((id) => state[id].owner || diagram.id))];
      for (const owner of owners) {
        yield call(render, owner);
      }
    }),
  });
}
