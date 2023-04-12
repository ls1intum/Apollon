import { Action } from '../../utils/actions/actions';
import { UMLElementFeatures } from '../uml-element/uml-element-features';

export enum Locale {
  en = 'en',
  de = 'de',
}

export enum ApollonMode {
  Modelling = 'Modelling',
  Exporting = 'Exporting',
  Assessment = 'Assessment',
}

export const enum ApollonView {
  Modelling = 'Modelling',
  Exporting = 'Exporting',
  Highlight = 'Highlight',
}

export const enum EditorActionTypes {
  CHANGE_VIEW = '@@element/CHANGE_VIEW',
}

export type EditorState = {
  readonly mode: ApollonMode;
  readonly readonly: boolean;
  readonly freehandDrawing: boolean;
  readonly enablePopups: boolean;
  readonly enableCopyPasteToClipboard: boolean;
  readonly view: ApollonView;
  readonly features: UMLElementFeatures;
  readonly colorEnabled: boolean;
  readonly scale: number;
};

export type EditorActions = ChangeViewAction;

export type ChangeViewAction = Action<EditorActionTypes.CHANGE_VIEW> & {
  payload: {
    view: ApollonView;
  };
};
