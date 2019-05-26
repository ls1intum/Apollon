import { SagaIterator } from 'redux-saga';
import { all, call, delay, Effect, put, race, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { notEmpty } from '../../utils/not-empty';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { MovableActionTypes, MoveEndAction } from '../uml-element/movable/movable-types';
import { ResizableActionTypes, ResizeEndAction } from '../uml-element/resizable/resizable-types';
import { IUMLElement } from '../uml-element/uml-element';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { UMLElementState } from '../uml-element/uml-element-types';
import { UMLContainer } from './uml-container';
import { UMLContainerRepository } from './uml-container-repository';
import { AppendAction, UMLContainerActionTypes } from './uml-container-types';

export function* UMLContainerSaga() {
  yield run([appendAfterMove, resizeAfterAppend, resizeAfterMove, resizeAfterResize]);
}

function* appendAfterMove(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.MOVE_END);
  const { elements, hovered }: ModelState = yield select();
  let containerID: string | null = null;

  if (hovered.length) {
    const container = elements[hovered[0]];
    if (!container || !UMLContainerRepository.isUMLContainer(container)) {
      return;
    }

    containerID = container.id;
  }

  const movedElements = action.payload.ids.filter(id => elements[id].owner !== containerID);
  if (!movedElements.length) {
    return;
  }

  yield put(UMLContainerRepository.append(movedElements, containerID || undefined));
}

function* resizeAfterAppend(): SagaIterator {
  const action: AppendAction = yield take(UMLContainerActionTypes.APPEND);
  const { elements, diagram }: ModelState = yield select();
  const elementState: UMLElementState = { ...elements, [diagram.id]: diagram };

  yield all(resize(action.payload.owner, elementState));
}

function* resizeAfterMove(): SagaIterator {
  const action: MoveEndAction = yield take(MovableActionTypes.MOVE_END);
  const { elements, diagram }: ModelState = yield select();
  const elementState: UMLElementState = { ...elements, [diagram.id]: diagram };

  const { append } = yield race({
    append: take(UMLContainerActionTypes.APPEND),
    resize: call(function*() {
      yield delay(0);

      const owner = action.payload.ids.map(id => elementState[id].owner || diagram.id);
      if (!owner.length || owner.some(id => id !== owner[0])) {
        return;
      }

      yield all(resize(owner[0], elementState));
    }),
  });

  if (append) {
    yield all(resize(diagram.id, elementState));
  }
}

function* resizeAfterResize(): SagaIterator {
  const action: ResizeEndAction = yield take(ResizableActionTypes.RESIZE_END);
  const { elements, diagram }: ModelState = yield select();
  const elementState: UMLElementState = { ...elements, [diagram.id]: diagram };

  const owner = action.payload.ids.map(id => elementState[id].owner || diagram.id);
  if (!owner.length || owner.some(id => id !== owner[0])) {
    return;
  }

  yield all(resize(owner[0], elementState));
}

function resize(owner: string, elements: UMLElementState): Effect[] {
  const element = elements[owner];
  let container: UMLContainer | null = null;

  if (element && UMLDiagramRepository.isUMLDiagram(element)) {
    container = UMLDiagramRepository.get(elements[owner]);
  }
  if (element && UMLContainerRepository.isUMLContainer(element)) {
    container = UMLElementRepository.get(element) as UMLContainer;
  }

  if (!container) {
    return [];
  }

  const ownedElements = container.ownedElements.map(id => UMLElementRepository.get(elements[id])).filter(notEmpty);
  const updates = container.render(ownedElements);
  return updateElements(updates, elements);
}

function updateElements(updates: IUMLElement[], elements: UMLElementState): Effect[] {
  const effects: Effect[] = [];

  for (const update of updates) {
    const original = elements[update.id];
    if (!original) continue;
    if (update.bounds.x !== original.bounds.x || update.bounds.y !== original.bounds.y) {
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
      effects.push(put(UMLElementRepository.endResizing(update.id)));
    }
    // const difference = diff(original, update);
    // for (const key of Object.keys(difference) as Array<keyof UMLElement>) {
    //   if (key === 'bounds') continue;
    //   effects.push(put<UpdateAction>(UMLElementRepository.update(update.id, { [key]: difference[key] })));
    // }
  }
  return effects;
}

// function diff(lhs: UMLElement, rhs: UMLElement): Partial<UMLElement> {
//   const deletedValues = Object.keys(lhs).reduce((acc, key) => {
//     return rhs.hasOwnProperty(key) ? acc : { ...acc, [key]: undefined };
//   }, {});

//   return (Object.keys(rhs) as Array<keyof UMLElement>).reduce((acc, key) => {
//     if (!lhs.hasOwnProperty(key)) return { ...acc, [key]: rhs[key] };
//     if (lhs[key] === rhs[key]) return acc;

//     return { ...acc, [key]: rhs[key] };
//   }, deletedValues);
// }
