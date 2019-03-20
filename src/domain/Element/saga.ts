import {
  takeLatest,
  put,
  select,
  all,
  SimpleEffect,
  PutEffectDescriptor,
} from 'redux-saga/effects';
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
  const current = elements[payload.id];
  console.log(
    'change',
    current.name,
    ' interactive from ',
    current.interactive,
    ' to ',
    !current.interactive
  );

  let owner = current.owner;
  while (owner) {
    const element = elements[owner];
    if (element.interactive) {
      console.log(`${element.name} is interactive, make it not interactive`);
      element.interactive = false;
      yield put<UpdateAction>(ElementRepository.update(element));
      break;
    }
    owner = element.owner;
  }
  current.interactive = !current.interactive;
  yield put<UpdateAction>(ElementRepository.update(current));

  if (current.base === 'Container') {
    const rec = (
      id: string
    ): SimpleEffect<'PUT', PutEffectDescriptor<UpdateAction>>[] => {
      const element = elements[id];
      if (element.interactive) {
        console.log(`${element.name} is interactive, make it not interactive`);
        element.interactive = false;
        return [put(ElementRepository.update(element))];
      }
      if (element.base === 'Container') {
        return (current as Container).ownedElements.reduce<
          SimpleEffect<'PUT', PutEffectDescriptor<UpdateAction>>[]
        >((a, o) => {
          return [...a, ...rec(o)];
        }, []);
      }
      return [];
    };

    yield all((current as Container).ownedElements.map(rec));

    yield put<UpdateAction>(ElementRepository.update(current));
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
