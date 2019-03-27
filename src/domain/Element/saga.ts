import { takeLatest, put, select, all } from 'redux-saga/effects';
import { State } from '../../components/Store';
import {
  ActionTypes,
  HoverAction,
  LeaveAction,
  SelectAction,
  MoveAction,
  DeleteAction,
  MakeInteractiveAction,
  UpdateAction,
} from './types';
import Element from './Element';
import Repository from './repository';
import Container from '../Container';
import { DiagramRepository } from '../Diagram';
import { ElementRepository } from '.';

function* saga() {
  yield takeLatest(ActionTypes.HOVER, handleElementHover);
  yield takeLatest(ActionTypes.LEAVE, handleElementLeave);
  yield takeLatest(ActionTypes.SELECT, handleElementSelect);
  yield takeLatest(ActionTypes.MAKE_INTERACTIVE, handleElementMakeInteractive);
  yield takeLatest(ActionTypes.MOVE, handleElementMove);
  yield takeLatest(ActionTypes.DELETE, handleElementDelete);
}

function* handleElementHover({ payload }: HoverAction) {
  if (payload.internal) return;
  const { elements }: State = yield select();
  const element: Element = elements[payload.id];
  if (element.owner) {
    yield put(Repository.leave(element.owner, true));
  }
}

function* handleElementLeave({ payload }: LeaveAction) {
  if (payload.internal) return;
  const { elements }: State = yield select();
  const element = elements[payload.id];
  if (element.owner) {
    yield put(Repository.hover(element.owner, true));
  }
}

function* handleElementSelect({ payload }: SelectAction) {
  if (payload.toggle) return;
  const { elements }: State = yield select();
  const selection = Object.values(elements).filter(
    element => element.selected && element.id !== payload.id
  );
  yield all(selection.map(element => put(Repository.select(element.id, true))));
}

function* handleElementMakeInteractive({ payload }: MakeInteractiveAction) {
  const { elements }: State = yield select();
  const current = ElementRepository.getById(elements)(payload.id);

  const update = (id: string, interactive: boolean) =>
    put<UpdateAction>(ElementRepository.update(id, { interactive }));

  let owner = current.owner;
  while (owner) {
    const element = elements[owner];
    if (element.interactive) {
      yield update(element.id, false);
      return;
    }
    owner = element.owner;
  }

  yield update(current.id, !current.interactive);

  if (current instanceof Container) {
    const rec = (id: string): ReturnType<typeof update>[] => {
      const child = ElementRepository.getById(elements)(id);
      if (child.interactive) {
        return [update(child.id, false)];
      }
      if (child instanceof Container) {
        return child.ownedElements.reduce<ReturnType<typeof update>[]>(
          (a, o) => {
            return [...a, ...rec(o)];
          },
          []
        );
      }
      return [];
    };

    const t = current.ownedElements.reduce<ReturnType<typeof update>[]>(
      (a, o) => [...a, ...rec(o)],
      []
    );
    yield all(t);
  }
}

function* handleElementMove({ payload }: MoveAction) {
  if (payload.id) return;
  const state: State = yield select();
  const diagram = DiagramRepository.read(state);
  const elements = ElementRepository.parse(state);

  const getSelection = (container: Container): Element[] => {
    if (container.selected) return [container];

    return container.ownedElements.reduce<Element[]>((result, id) => {
      const element = elements[id];
      if (!element) return result;
      if (element.selected) return [...result, element];
      if (element instanceof Container)
        return [...result, ...getSelection(element)];
      return result;
    }, []);
  };
  yield all(
    getSelection(diagram).map(element =>
      put(Repository.move(element.id, payload.delta))
    )
  );
}

function* handleElementDelete({ payload }: DeleteAction) {
  if (payload.id) return;

  const { elements }: State = yield select();
  const selection = Object.values(elements).filter(
    element => element.selected && element.id !== payload.id
  );
  yield all(
    selection.map(element => put(ElementRepository.delete(element.id)))
  );
}

export default saga;
