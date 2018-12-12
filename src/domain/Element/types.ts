import Element from '.';
import Omit from '../utils/Omit';

export const enum ActionTypes {
  CREATE = '@@element/CREATE',
  UPDATE = '@@element/UPDATE',
  DELETE = '@@element/DELETE',
}

export interface ElementState {
  readonly [id: string]: Omit<Element, 'render'>;
}
