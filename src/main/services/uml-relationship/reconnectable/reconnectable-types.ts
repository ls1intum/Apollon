import { Action } from '../../../utils/actions/actions.js';
import { Connection } from '../connection.js';
import { IUMLRelationship } from '../uml-relationship.js';

export const enum ReconnectableActionTypes {
  START = '@@element/reconnectable/START',
  END = '@@element/reconnectable/END',
  RECONNECT = '@@element/reconnectable/RECONNECT',
}

export type ReconnectableState = { [id: string]: 'source' | 'target' };

export type ReconnectableActions = ReconnectStartAction | ReconnectEndAction | ReconnectAction;

export type ReconnectStartAction = Action<ReconnectableActionTypes.START> & {
  payload: {
    ids: string[];
    endpoint: 'source' | 'target';
  };
};

export type ReconnectEndAction = Action<ReconnectableActionTypes.END> & {
  payload: {
    ids: string[];
  };
};

export type ReconnectAction = Action<ReconnectableActionTypes.RECONNECT> & {
  payload: {
    connections: (Pick<IUMLRelationship, 'id'> & Connection)[];
  };
};
