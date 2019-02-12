import Element from '.';
import Diagram from '../Diagram';
import Omit from '../utils/Omit';

export const enum ActionTypes {
  CREATE = '@@element/CREATE',
  UPDATE = '@@element/UPDATE',
  RESIZE = '@@element/RESIZE',
  DELETE = '@@element/DELETE',
}

export interface ElementState {
  readonly [id: string]: Element;
}
