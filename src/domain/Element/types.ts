import { Entity as Element } from './../../core/domain';

export const enum ActionTypes {
  SELECT = '@@element/SELECT',
  DESELECT = '@@element/DESELECT',
}

export interface ElementState {
  readonly [id: string]: Element;
}
