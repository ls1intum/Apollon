import { Action } from 'redux';
import { ApollonMode } from './../../ApollonEditor';

export const enum ApollonView {
  Modelling = 'Modelling',
  Exporting = 'Exporting',
  Highlight = 'Highlight',
}

export const enum ActionTypes {
  CHANGE_VIEW = '@@element/CHANGE_VIEW',
}

export type Actions = ChangeViewAction;

export interface ChangeViewAction extends Action<ActionTypes.CHANGE_VIEW> {
  payload: {
    view: ApollonView;
  };
}

export interface State {
  readonly mode: ApollonMode;
  readonly readonly: boolean;
  readonly view: ApollonView;
}
