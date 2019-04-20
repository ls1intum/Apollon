import { Constructor } from 'react-native';
import { DeselectAction, InteractableActionTypes, SelectAction } from './interactable-types';

export function Interactable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static makeInteractive = (id: string): SelectAction => ({
      type: InteractableActionTypes.SELECT,
      payload: { id },
    });

    static unmakeInteractive = (id: string): DeselectAction => ({
      type: InteractableActionTypes.DESELECT,
      payload: { id },
    });
  };
}
