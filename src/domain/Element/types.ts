import Element from '.';

export const enum ActionTypes {
  CREATE = '@@element/CREATE',
  UPDATE = '@@element/UPDATE',
}

export interface ElementState {
  readonly [id: string]: Element
}
