import { AsyncAction } from '../../utils/actions/actions';
import { LayouterActionTypes } from './layouter-types';

export const LayouterRepository = {
  layout: (): AsyncAction => dispatch =>
    dispatch({
      type: LayouterActionTypes.LAYOUT,
      payload: {},
    }),
};
