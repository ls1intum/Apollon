import { SagaIterator } from 'redux-saga';
import { all, call, getContext, put, select, take } from 'redux-saga/effects';
import { ModelState } from '../../components/store/model-state';
import { run } from '../../utils/actions/sagas';
import { diff } from '../../utils/fx/diff';
import { ILayer } from '../layouter/layer';
import { RemoveAction, UMLContainerActionTypes } from '../uml-container/uml-container-types';
import { MoveAction, MovingActionTypes } from '../uml-element/movable/moving-types';
import { ResizeAction, ResizingActionTypes } from '../uml-element/resizable/resizing-types';
import { UMLElementRepository } from '../uml-element/uml-element-repository';
import { CreateAction, DeleteAction, UMLElementActionTypes, UpdateAction } from '../uml-element/uml-element-types';
import { ReconnectableActionTypes, ReconnectAction } from './reconnectable/reconnectable-types';
import { IUMLRelationship, UMLRelationship } from './uml-relationship';
import { UMLRelationshipRepository } from './uml-relationship-repository';
import {
  EndWaypointsAction,
  LayoutAction,
  UMLRelationshipActionTypes,
  WaypointLayoutAction,
} from './uml-relationship-types';
import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { IUMLCommunicationLink } from '../../packages/uml-communication-diagram/uml-communication-link/uml-communication-link';
import { UMLDiagramRepository } from '../uml-diagram/uml-diagram-repository';
import { notEmpty } from '../../utils/not-empty';

export function* UMLRelationshipSaga() {
  yield run([create, reconnect, update, layoutElement, layoutRelationship, deleteElement]);
}

function* create(): SagaIterator {
  const action: CreateAction = yield take(UMLElementActionTypes.CREATE);
  for (const value of action.payload.values) {
    yield call(recalc, value.id);
  }
}

function* reconnect(): SagaIterator {
  const action: ReconnectAction = yield take(ReconnectableActionTypes.RECONNECT);
  for (const connection of action.payload.connections) {
    yield call(recalc, connection.id);
  }
}

function* layoutRelationship(): SagaIterator {
  const action: EndWaypointsAction = yield take(UMLRelationshipActionTypes.ENDWAYPOINTSLAYOUT);
  const layer: ILayer = yield getContext('layer');
  const { elements, diagram }: ModelState = yield select();
  const children = [
    ...diagram.ownedElements.map((id) => UMLElementRepository.get(elements[id])),
    ...diagram.ownedRelationships.map((id) => UMLRelationshipRepository.get(elements[id])),
  ].filter(notEmpty);
  const container = UMLDiagramRepository.get(diagram);

  if (!container) {
    return;
  }

  const [updates] = container.render(layer, children);
  const delta = {
    width: updates.bounds.width - diagram.bounds.width,
    height: updates.bounds.height - diagram.bounds.height,
  };

  yield put({
    type: ResizingActionTypes.RESIZE,
    payload: { ids: [diagram.id], delta },
    undoable: false,
  });
}

function* update(): SagaIterator {
  const action: UpdateAction = yield take(UMLElementActionTypes.UPDATE);
  const { elements }: ModelState = yield select();

  for (const value of action.payload.values) {
    if (!UMLRelationship.isUMLRelationship(elements[value.id])) {
      continue;
    }

    yield call(recalc, value.id);
  }
}

function* layoutElement(): SagaIterator {
  const action: MoveAction | ResizeAction = yield take([MovingActionTypes.MOVE, ResizingActionTypes.RESIZE]);
  const { elements }: ModelState = yield select();
  const relationships = Object.values(elements).filter((x): x is IUMLRelationship =>
    UMLRelationship.isUMLRelationship(x),
  );
  const updates: string[] = [];

  loop: for (const relationship of relationships) {
    let source: string | null = relationship.source.element;
    while (source) {
      if (action.payload.ids.includes(source)) {
        updates.push(relationship.id);
        continue loop;
      }
      source = elements[source].owner;
    }
    let target: string | null = relationship.target.element;
    while (target) {
      if (action.payload.ids.includes(target)) {
        updates.push(relationship.id);
        continue loop;
      }
      target = elements[target].owner;
    }
  }

  for (const id of [...new Set([...updates])]) {
    yield call(recalc, id);
  }
}

function* deleteElement(): SagaIterator {
  const action: DeleteAction = yield take(UMLElementActionTypes.DELETE);
  const { elements }: ModelState = yield select();
  const relationships = Object.values(elements)
    .filter((x): x is IUMLRelationship => UMLRelationship.isUMLRelationship(x))
    .filter(
      (relationship) =>
        action.payload.ids.includes(relationship.source.element) ||
        action.payload.ids.includes(relationship.target.element),
    )
    .map((relationship) => relationship.id);

  yield all([
    put<RemoveAction>({
      type: UMLContainerActionTypes.REMOVE,
      payload: { ids: relationships },
      undoable: false,
    }),
    put<DeleteAction>({
      type: UMLElementActionTypes.DELETE,
      payload: { ids: relationships },
      undoable: false,
    }),
  ]);
}

export function* recalc(id: string): SagaIterator {
  const { elements, selected, editor }: ModelState = yield select();
  const layer: ILayer = yield getContext('layer');
  const relationship = UMLRelationshipRepository.get(elements[id]);
  if (!relationship) {
    return;
  }

  const source = UMLElementRepository.get(elements[relationship.source.element]);
  const target = UMLElementRepository.get(elements[relationship.target.element]);
  if (!source || !target) {
    return;
  }

  const sourcePosition = yield put(UMLElementRepository.getAbsolutePosition(relationship.source.element));
  source.bounds = { ...source.bounds, ...sourcePosition };

  const targetPosition = yield put(UMLElementRepository.getAbsolutePosition(relationship.target.element));
  target.bounds = { ...target.bounds, ...targetPosition };

  const original = elements[id] as any;
  const [updates] = relationship.render(layer, source, target) as UMLRelationship[];

  const { path, bounds } = diff(original, updates) as Partial<IUMLRelationship>;
  if (path) {
    if (relationship.isManuallyLayouted && shouldPreserveLayout(source.id, target.id, selected, editor.readonly)) {
      yield put<WaypointLayoutAction>(
        UMLRelationshipRepository.layoutWaypoints(updates.id, original.path, { ...original.bounds, ...bounds }),
      );
    } else {
      yield put<LayoutAction>(UMLRelationshipRepository.layout(updates.id, path, { ...original.bounds, ...bounds }));
    }
  }
  // layout messages of CommunicationLink
  if (updates.type === UMLRelationshipType.CommunicationLink) {
    yield put<UpdateAction>(UMLElementRepository.update<IUMLCommunicationLink>(updates.id, updates));
  }
}

const shouldPreserveLayout = (sourceId: string, targetId: string, selected: string[], isEditorReadOnly: boolean) => {
  return (selected.includes(sourceId) && selected.includes(targetId)) || isEditorReadOnly ? true : false;
};
