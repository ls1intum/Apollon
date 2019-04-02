import { Action } from 'redux';
import { ApollonMode } from '../../typings';

export const enum ApollonView {
  Modelling = 'Modelling',
  Exporting = 'Exporting',
  Highlight = 'Highlight',
}

export const enum EditorActionTypes {
  CHANGE_VIEW = '@@element/CHANGE_VIEW',
}

export type Actions = ChangeViewAction;

export interface ChangeViewAction extends Action<EditorActionTypes.CHANGE_VIEW> {
  payload: {
    view: ApollonView;
  };
}

export interface EditorState {
  readonly mode: ApollonMode;
  readonly readonly: boolean;
  readonly enablePopups: boolean;
  readonly view: ApollonView;
}
