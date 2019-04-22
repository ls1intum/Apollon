import { Constructor } from 'react-native';
import { HoverableActionTypes, HoverAction, LeaveAction } from './hoverable-types';

export const Hoverable = <C extends Constructor<{}>>(Repository: C) =>
  class extends Repository {
    static hover = (id: string | string[]): HoverAction => ({
      type: HoverableActionTypes.HOVER,
      payload: {
        ids: Array.isArray(id) ? id : [id],
      },
    });

    static leave = (id: string | string[]): LeaveAction => ({
      type: HoverableActionTypes.LEAVE,
      payload: {
        ids: Array.isArray(id) ? id : [id],
      },
    });
  };
