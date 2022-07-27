import { AsyncAction } from '../../../utils/actions/actions';
import { IPath } from '../../../utils/geometry/path';
import {
  ConnectionLayoutableActionTypes,
  ConnectionLayoutEndAction,
  ConnectionLayoutStartAction,
} from './connectionlayoutable-types';

export const ConnectionLayoutableRepository = {
  startConnectionLayout:
    (id: string, path: IPath): AsyncAction =>
    (dispatch) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : undefined;
      if (ids && !ids.length) {
        return;
      }

      dispatch<ConnectionLayoutStartAction>({
        type: ConnectionLayoutableActionTypes.START,
        payload: { id, path },
        undoable: false,
      });
    },

  endConnectionLayout:
    (id: string): AsyncAction =>
    (dispatch) => {
      if (!id.length) {
        return;
      }

      dispatch<ConnectionLayoutEndAction>({
        type: ConnectionLayoutableActionTypes.END,
        payload: { id },
        undoable: false,
      });
    },
};
