import { Action } from '../../utils/actions/actions';
import { IUMLElement } from '../uml-element/uml-element';

export const enum CopyActionTypes {
  COPY = '@@copy/COPY',
  PASTE = '@@copy/PASTE',
}

export type CopyState = IUMLElement[];

export type CopyActions = CopyAction | PasteAction;

export type CopyAction = Action<CopyActionTypes.COPY> & {
  payload: CopyState;
};

export type PasteAction = Action<CopyActionTypes.PASTE>;
