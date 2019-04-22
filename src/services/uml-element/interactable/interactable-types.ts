import { Action } from '../../../utils/actions/actions';

export const enum InteractableActionTypes {
  SELECT = '@@element/interactable/SELECT',
  DESELECT = '@@element/interactable/DESELECT',
}

export type InteractableActions = SelectAction | DeselectAction;

export interface SelectAction extends Action<InteractableActionTypes.SELECT> {
  payload: {
    id: string;
  };
}

export interface DeselectAction extends Action<InteractableActionTypes.DESELECT> {
  payload: {
    id: string;
  };
}

export interface InteractableState extends Array<string> {}