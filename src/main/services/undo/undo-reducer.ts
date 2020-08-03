import { Reducer } from 'redux';
import { ModelState } from '../../components/store/model-state';
import { Action } from '../../utils/actions/actions';
import { isInternal } from '../../utils/actions/sagas';
import { Actions } from '../actions';
import { UndoActionTypes } from './undo-types';

const MAX_UNDO_STACK_SIZE = 25;

export const undoable = <S = ModelState, T extends Action = Actions>(reducer: Reducer<S, T>): Reducer<S, T> => {
  type Screenshot = [S, T];
  const past = new Stack<Screenshot>(MAX_UNDO_STACK_SIZE);
  const future = new Stack<Screenshot>(MAX_UNDO_STACK_SIZE);

  return (state = {} as any, action): S => {
    switch (action.type) {
      case UndoActionTypes.UNDO: {
        const previous = past.pop();
        if (!previous) return state;
        future.push([state, action]);
        return previous[0];
      }
      case UndoActionTypes.REDO: {
        const next = future.pop();
        if (!next) return state;
        past.push([state, action]);
        return next[0];
      }
      default:
        const ignore = isInternal(action) || !action.undoable;

        if (!ignore) {
          future.clear();
          past.push([state, action]);
        }
        return reducer(state, action);
    }
  };
};

class Stack<T> {
  private maxSize: number;
  private items: T[];

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.items = [];
  }

  get latest(): T | null {
    return this.items.length ? this.items[this.items.length - 1] : null;
  }

  push(item: T) {
    const newLength = this.items.push(item);
    if (newLength > this.maxSize) {
      this.items.shift();
    }
  }

  pop() {
    return this.items.pop();
  }

  clear() {
    this.items.length = 0;
  }
}
