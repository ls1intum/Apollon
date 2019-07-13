import { Action } from '../../../utils/actions/actions';

export const enum InteractableActionTypes {
  SELECT = '@@element/interactable/SELECT',
  DESELECT = '@@element/interactable/DESELECT',
}

export type InteractableState = string[];

export type InteractableActions = SelectAction | DeselectAction;

export type SelectAction = Action<InteractableActionTypes.SELECT> & {
  payload: {
    ids: string[];
  };
};

export type DeselectAction = Action<InteractableActionTypes.DESELECT> & {
  payload: {
    ids: string[];
  };
};
