import { Action, AnyAction, Reducer } from 'redux';
import { MoveAction } from '../uml-element/movable/movable-types';
import { ResizeAction } from '../uml-element/resizable/resizable-types';
import { UndoActionTypes } from './undo-types';

const MAX_UNDO_STACK_SIZE = 25;

export const undoable = <S = any, T extends Action = AnyAction>(reducer: Reducer<S, T>): Reducer<S, T> => {
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
        let ignore =
          !!(action as any)['@@redux-saga/SAGA_ACTION'] ||
          action.type.includes('@@redux') ||
          action.type.includes('HOVER') ||
          action.type.includes('LEAVE') ||
          action.type.includes('SELECT') ||
          action.type.includes('CHANGE_OWNER');

        const latest: Screenshot | null = past.latest;
        if (latest && latest[1].type.includes('MOVE') && action.type.includes('MOVE')) {
          const current = (action as any) as MoveAction;
          const previous = (latest[1] as any) as MoveAction;
          ignore = ignore || current.payload.ids === previous.payload.ids;
        }
        if (latest && latest[1].type.includes('RESIZE') && action.type.includes('RESIZE')) {
          const current = (action as any) as ResizeAction;
          const previous = (latest[1] as any) as ResizeAction;
          ignore = ignore || current.payload.ids === previous.payload.ids;
        }

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
