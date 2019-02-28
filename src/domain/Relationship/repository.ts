import { ActionCreator } from 'redux';
import Relationship from './Relationship';
import { CreateAction, ActionTypes } from './types';
import { State } from '../Element/types';

class Repository {
  static create: ActionCreator<CreateAction> = (
    relationship: Relationship
  ) => ({
    type: ActionTypes.CREATE,
    payload: { relationship },
  });

  static getById = (state: State) => (id: string): Relationship => {
    const relationship = { ...state[id] };
    if (!Object.keys(relationship).length) return relationship as Relationship;
    return Object.setPrototypeOf(relationship, Relationship.prototype);
  };
}

export default Repository;
