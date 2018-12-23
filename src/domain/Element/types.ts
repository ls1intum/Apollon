import Element from '.';
import Omit from '../utils/Omit';

export const enum ActionTypes {
  CREATE = '@@element/CREATE',
  UPDATE = '@@element/UPDATE',
  DELETE = '@@element/DELETE',
}

export interface E extends Omit<Element, 'ownedElements' | 'owner'> {
  ownedElements: string[];
  owner: string | null;
}

export interface ElementState {
  readonly [id: string]: E;
}
