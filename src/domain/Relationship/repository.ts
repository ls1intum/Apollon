import Relationship from './Relationship';
import { ActionTypes, ConnectAction } from './types';
import { State } from '../Element/types';
import Port from '../Port';

class Repository {
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

  static read = (state: State): Relationship[] => {
    return Object.values(state)
      .filter(element => element.base === 'Relationship')
      .map(relationship =>
        Repository.getById({ [relationship.id]: state[relationship.id] })(
          relationship.id
        )
      );
  };
}

export default Repository;
