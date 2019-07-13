import { DeselectAction, InteractableActionTypes, SelectAction } from './interactable-types';

export const Interactable = {
  makeInteractive: (id: string): SelectAction => ({
    type: InteractableActionTypes.SELECT,
    payload: { ids: [id] },
    undoable: false,
  }),

  unmakeInteractive: (id: string): DeselectAction => ({
    type: InteractableActionTypes.DESELECT,
    payload: { ids: [id] },
    undoable: false,
  }),
};
