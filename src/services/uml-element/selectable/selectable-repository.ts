import { Constructor } from 'react-native';
import { AsyncAction } from '../../../utils/actions/actions';
import { DeselectAction, SelectableActionTypes, SelectAction } from './selectable-types';

export function Selectable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static deselect = (id: string | string[]): DeselectAction => ({
      type: SelectableActionTypes.DESELECT,
      payload: { ids: Array.isArray(id) ? id : [id] },
    });

    static deselectAll = (): AsyncAction<DeselectAction> => (dispatch, getState) => {
      const ids = getState().selected;
      return dispatch({
        type: SelectableActionTypes.DESELECT,
        payload: { ids, toggle: false },
      });
    };

    static select = (id: string | string[], toggle: boolean = false): SelectAction => ({
      type: SelectableActionTypes.SELECT,
      payload: { ids: Array.isArray(id) ? id : [id], toggle },
    });

    static selectAll = (): AsyncAction<SelectAction> => (dispatch, getState) => {
      const elements = getState().elements;
      const ids = Object.keys(elements);

      return dispatch({
        type: SelectableActionTypes.SELECT,
        payload: { ids, toggle: false },
      });
    };
  };
}
