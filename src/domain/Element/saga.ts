import { takeLatest, put, select, all } from 'redux-saga/effects';
import { State } from '../../components/Store';
import {
  ActionTypes,
  HoverAction,
  LeaveAction,
  SelectAction,
  MoveAction,
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
  yield takeLatest(ActionTypes.MOVE, handleElementMove);
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

function* handleElementMove({ payload }: MoveAction) {
  if (payload.id) return;
  const state: State = yield select();
  const diagram = DiagramRepository.read(state);
  const elements = ElementRepository.parse(state);

  const getSelection = (container: Container): Element[] => {
    if (container.selected) return [container];

    return container.ownedElements.reduce<Element[]>((result, id) => {
      const element = elements[id];
      if (element.selected) return [...result, element];
      if (element instanceof Container)
        return [...result, ...getSelection(element)];
      return result;
    }, []);
  };
  yield all(
    getSelection(diagram).map(element =>
      put(Repository.move(element.id, payload.delta, true))
    )
  );
}

export default saga;
