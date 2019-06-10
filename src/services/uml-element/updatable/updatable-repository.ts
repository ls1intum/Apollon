import { AsyncAction } from '../../../utils/actions/actions';
import { UpdatableActionTypes, UpdateEndAction, UpdateStartAction } from './updatable-types';

export const Updatable = {
  updateStart: (id: string | string[]): AsyncAction => (dispatch, getState) => {
    if (getState().updating.length) {
      return null;
    }

    dispatch<UpdateStartAction>({
      type: UpdatableActionTypes.UPDATE_START,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });
  },

  updateEnd: (id: string | string[]): UpdateEndAction => ({
    type: UpdatableActionTypes.UPDATE_END,
    payload: { ids: Array.isArray(id) ? id : [id] },
  }),
};
