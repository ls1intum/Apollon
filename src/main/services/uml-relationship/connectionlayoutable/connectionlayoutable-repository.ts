import { AsyncAction } from '../../../utils/actions/actions';
import { IPath } from '../../../utils/geometry/path';
import { ConnectionLayoutableActionTypes, ConnectionLayoutAction } from './connectionlayoutable-types';

export const ConnectionLayoutableRepository = {
  connectionLayout:
    (id: string, path: IPath): AsyncAction =>
    (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : undefined;
      if (ids && !ids.length) {
        return;
      }

      dispatch<ConnectionLayoutAction>({
        type: ConnectionLayoutableActionTypes.CONNECTIONLAYOUT,
        payload: { id, path },
        undoable: false,
      });
    },
};
