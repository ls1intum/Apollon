import { Constructor } from 'react-native';
import { AsyncAction } from '../../../utils/actions/actions';
import { DeselectAction, SelectableActionTypes, SelectAction } from './selectable-types';

export function Selectable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static deselect = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
      if (!ids.length) {
        return;
      }

      dispatch<DeselectAction>({
        type: SelectableActionTypes.DESELECT,
        payload: { ids },
      });
    };

    static select = (id?: string | string[]): AsyncAction => (dispatch, getState) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : Object.keys(getState().elements);
      if (!ids.length) {
        return;
      }

      dispatch<SelectAction>({
        type: SelectableActionTypes.SELECT,
        payload: { ids },
      });
    };
  };
}
