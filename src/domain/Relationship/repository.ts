import { ActionCreator } from 'redux';
import Relationship from './Relationship';
import { CreateAction, ActionTypes, ConnectAction } from './types';
import { State } from '../Element/types';
import Port from '../Port';

class Repository {
  static create: ActionCreator<CreateAction> = (
    relationship: Relationship
  ) => ({
    type: ActionTypes.CREATE,
    payload: { relationship },
  });

  static connect = (
    id: string,
    { source, target }: { source?: Port; target?: Port }
  ): ConnectAction => ({
    type: ActionTypes.CONNECT,
    payload: { id, source, target },
  });

  static getById = (state: State) => (id: string): Relationship => {
    const relationship = { ...state[id] };
    if (!Object.keys(relationship).length) return relationship as Relationship;
    return Object.setPrototypeOf(relationship, Relationship.prototype);
  };
}

export default Repository;
