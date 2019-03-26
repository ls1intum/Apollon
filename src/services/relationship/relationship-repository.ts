import { Relationship } from './relationship';
import { RelationshipActionTypes, ConnectAction } from './relationship-types';
import { ElementState } from '../element/element-types';
import Port from '../../domain/Port';
import * as Plugins from '../../domain/plugins';

export class RelationshipRepository {
  static connect = (id: string, { source, target }: { source?: Port; target?: Port }): ConnectAction => ({
    type: RelationshipActionTypes.CONNECT,
    payload: { id, source, target },
  });

  static getById = (state: ElementState) => (id: string): Relationship => {
    const relationship = { ...state[id] };
    if (!Object.keys(relationship).length) return relationship as Relationship;
    return Object.setPrototypeOf(relationship, (<any>Plugins)[relationship.type].prototype);
  };

  static read = (state: ElementState): Relationship[] => {
    return Object.values(state)
      .filter(element => 'path' in element)
      .map(relationship => RelationshipRepository.getById({ [relationship.id]: state[relationship.id] })(relationship.id));
  };
}
