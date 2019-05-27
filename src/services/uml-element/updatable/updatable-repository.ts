import { Constructor } from 'react-native';
import { UpdatableActionTypes, UpdateEndAction, UpdateStartAction } from './updatable-types';

export const Updatable = <C extends Constructor<{}>>(Repository: C) =>
  class extends Repository {
    static updateStart = (id: string | string[]): UpdateStartAction => ({
      type: UpdatableActionTypes.UPDATE_START,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });

    static updateEnd = (id: string | string[]): UpdateEndAction => ({
      type: UpdatableActionTypes.UPDATE_END,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });
  };