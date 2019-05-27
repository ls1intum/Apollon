import { Constructor } from 'react-native';
import { AsyncAction } from '../../../utils/actions/actions';
import { Connection } from '../../uml-relationship/connection';
import { Direction, Port } from '../port';
import { ConnectableActionTypes, ConnectEndAction, ConnectStartAction } from './connectable-types';

export function Connectable<TBase extends Constructor<{}>>(Base: TBase) {
  return class extends Base {
    static startConnecting = (direction: Direction | Direction[], id?: string | string[]): AsyncAction => (
      dispatch,
      getState,
    ) => {
      const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
      const directions = Array.isArray(direction) ? direction : [direction];
      if (!ids.length || (directions.length !== 1 && directions.length !== ids.length)) {
        return;
      }

      const ports = ids.map<Port>((element, index) => ({
        element,
        direction: directions.length === 1 ? directions[0] : directions[index],
      }));

      dispatch<ConnectStartAction>({
        type: ConnectableActionTypes.CONNECT_START,
        payload: { ports },
      });
    };

    static connect = (target: Port | Port[], source?: Port | Port[]): AsyncAction => (dispatch, getState) => {
      const sources = source ? (Array.isArray(source) ? source : [source]) : getState().connecting;
      const targets = Array.isArray(target) ? target : [target];
      if (!targets.length || (targets.length !== 1 && targets.length !== sources.length)) {
        return;
      }

      if (!source) {
        dispatch<ConnectEndAction>({
          type: ConnectableActionTypes.CONNECT_END,
          payload: { ports: sources },
        });
      }

      const connections: Connection[] = [];
      for (const index in sources) {
        if (sources[index] === targets[index]) {
          continue;
        }

        connections.push({ source: sources[index], target: targets.length === 1 ? targets[0] : targets[index] });
      }

      // TODO: create relationship from connections
    };

    static endConnecting = (port?: Port | Port[]): AsyncAction => (dispatch, getState) => {
      const ports = port ? (Array.isArray(port) ? port : [port]) : getState().connecting;
      if (!ports.length) {
        return;
      }

      dispatch<ConnectEndAction>({
        type: ConnectableActionTypes.CONNECT_END,
        payload: { ports },
      });
    };
  };
}
