import { SagaIterator } from 'redux-saga';
import { all, call, delay, Effect, put, race, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { UMLElements } from '../../packages/uml-elements';
import { UMLElementType } from '../../typings';
import { run } from '../../utils/actions/sagas';
import { diff } from '../../utils/fx/diff';
import { notEmpty } from '../../utils/not-empty';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { MovableActionTypes, MoveEndAction } from '../uml-element/movable/movable-types';
import { ResizableActionTypes, ResizeEndAction } from '../uml-element/resizable/resizable-types';
import { ResizeAction, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { IUMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLElementActionTypes, UMLElementState, UpdateAction } from '../uml-element/uml-element-types';
import { UMLContainer } from './uml-container';
import { UMLContainerRepository } from './uml-container-repository';
import { AppendAction, RemoveAction, UMLContainerActionTypes } from './uml-container-types';

export function* UMLContainerSaga() {
  yield run([
    append,
    remove,
    appendAfterMove,
    resizeAfterMove,
    resizeAfterResize,
    resizeWhileResize,
    resizeAfterUpdate,
  ]);
}

const updateElements = (updates: IUMLElement[], elements: UMLElementState, isEnd = true): Effect[] => {
  const effects: Effect[] = [];

  for (const update of updates) {
    const original = elements[update.id];
    if (!original) {
      continue;
    }
    if (
      !UMLDiagramRepository.isUMLDiagram(update) &&
      (update.bounds.x !== original.bounds.x || update.bounds.y !== original.bounds.y)
    ) {
      effects.push(
        put(
          UMLElementRepository.move(
            {
              x: update.bounds.x - original.bounds.x,
              y: update.bounds.y - original.bounds.y,
            },
            update.id,
          ),
        ),
      );
    }
    if (update.bounds.width !== original.bounds.width || update.bounds.height !== original.bounds.height) {
      effects.push(
        put(
          UMLElementRepository.resize(
            {
              width: update.bounds.width - original.bounds.width,
              height: update.bounds.height - original.bounds.height,
            },
            update.id,
          ),
        ),
      );
      if (isEnd && !UMLDiagramRepository.isUMLDiagram(update)) {
        effects.push(put(UMLElementRepository.endResizing(update.id)));
      }
    }

    if (!UMLDiagramRepository.isUMLDiagram(update)) {
      const { id, name, owner, type, bounds, ownedElements, ...difference } = diff(original, update) as any;
      if (Object.keys(difference).length) {
        effects.push(put<UpdateAction>(UMLElementRepository.update(update.id, { ...difference })));
      }
    }
  }

  return effects;
};

const resize = (owner: string, elements: UMLElementState, isEnd = true): Effect[] => {
  const container: UMLContainer | null = UMLContainerRepository.get(elements[owner]);

  if (!container) {
    return [];
  }

  const ownedElements = container.ownedElements.map(id => UMLElementRepository.get(elements[id])).filter(notEmpty);
  const updates = container.resize(ownedElements);

  return updateElements(updates, elements, isEnd);
};

function* append(): SagaIterator {
  const action: AppendAction = yield take(UMLContainerActionTypes.APPEND);
  const { elements, diagram }: ModelState = yield select();
  const state: UMLElementState = { ...elements, [diagram.id]: diagram };
  const container = UMLContainerRepository.get(state[action.payload.owner]);

  if (!container) {
    return;
  }

  const ownedElements = container.ownedElements.map(id => UMLElementRepository.get(state[id])).filter(notEmpty);
  const updates = container.appendElements(
    ownedElements.filter(element => action.payload.ids.includes(element.id)),
    ownedElements.filter(element => !action.payload.ids.includes(element.id)),
  );

  yield all(updateElements(updates, state));
}

function* remove(): SagaIterator {
  const action: RemoveAction = yield take(UMLContainerActionTypes.REMOVE);
  const { elements, diagram }: ModelState = yield select();
  const state: UMLElementState = { ...elements, [diagram.id]: diagram };
  const owners = [...new Set(action.payload.ids.map(id => state[id].owner || diagram.id))];

  const effects: Effect[] = [];
  for (const owner of owners) {
    const container = UMLContainerRepository.get(state[owner]);

    if (!container) {
      continue;
    }

    const ownedElements = [...action.payload.ids, ...container.ownedElements]
      .map(id => UMLElementRepository.get(state[id]))
      .filter(notEmpty);

    const updates = container.removeElements(
      ownedElements.filter(element => !container.ownedElements.includes(element.id)),
      ownedElements.filter(element => container.ownedElements.includes(element.id)),
    );
    effects.push(...updateElements(updates, state));
  }
  yield all(effects);
}

function* appendAfterMove(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.MOVE_END);
  const { elements, hovered }: ModelState = yield select();
  let containerID: string | null = null;

  if (hovered.length) {
    const container = elements[hovered[0]];
    if (
      !container ||
      !UMLContainerRepository.isUMLContainer(container) ||
      !UMLElements[container.type as UMLElementType].features.droppable
    ) {
      return;
    }

    containerID = container.id;
  }

  const movedElements = action.payload.ids.filter(id => elements[id].owner !== containerID && id !== containerID);
  if (!movedElements.length || action.payload.keyboard) {
    return;
  }

  yield put(UMLContainerRepository.remove(movedElements));
  yield put(UMLContainerRepository.append(movedElements, containerID || undefined));
}

function* resizeAfterMove(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.MOVE_END);
  const { elements, diagram }: ModelState = yield select();
  const elementState: UMLElementState = { ...elements, [diagram.id]: diagram };

  yield race({
    append: take(UMLContainerActionTypes.APPEND),
    resize: call(function*() {
      yield delay(0);

      const owners = [...new Set(action.payload.ids.map(id => elementState[id].owner || diagram.id))];
      yield all(owners.reduce<Effect[]>((effects, owner) => [...effects, ...resize(owner, elementState)], []));
    }),
  });
}

function* resizeWhileResize(): SagaIterator {
  const action: ResizeAction = yield take(ResizingActionTypes.RESIZE);
  const { elements }: ModelState = yield select();
  yield all(action.payload.ids.reduce<Effect[]>((effects, id) => [...effects, ...resize(id, elements, false)], []));
}

function* resizeAfterResize(): SagaIterator {
  const action: ResizeEndAction = yield take(ResizableActionTypes.RESIZE_END);
  const { elements, diagram }: ModelState = yield select();
  const elementState: UMLElementState = { ...elements, [diagram.id]: diagram };

  const owners = [...new Set(action.payload.ids.map(id => elementState[id].owner || diagram.id))];
  yield all(owners.reduce<Effect[]>((effects, owner) => [...effects, ...resize(owner, elementState)], []));
}

function* resizeAfterUpdate(): SagaIterator {
  const action: UpdateAction = yield take(UMLElementActionTypes.UPDATE);
  const { elements }: ModelState = yield select();
  const ids = action.payload.values.map(value => value.id);

  const effects: Effect[] = [];
  for (const id of ids) {
    const container = UMLContainerRepository.get(elements[id]);

    if (!container) {
      continue;
    }

    const ownedElements = container.ownedElements
      .map(ownedElement => UMLElementRepository.get(elements[ownedElement]))
      .filter(notEmpty);

    const updates = container.resize(ownedElements);
    effects.push(...updateElements(updates, elements));
  }
  yield all(effects);
}
