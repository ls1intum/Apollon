import { Relationship, IRelationship } from './relationship';
import { RelationshipActionTypes, ConnectAction, CreateAction } from './relationship-types';
import { ElementState } from '../element/element-types';
import { Port } from '../element/port';
import { Relationships } from '../../packages/relationships';
import { RelationshipType } from '../../packages/relationship-type';
import { notEmpty } from '../../utils/not-empty';
import { ModelState } from '../../components/store/model-state';
import { UMLRelationship } from '../../typings';

export class RelationshipRepository {
  static create = (relationship: Relationship): CreateAction => ({
    type: RelationshipActionTypes.CREATE,
    payload: { relationship },
  });

  static connect = (id: string, { source, target }: { source?: Port; target?: Port }): ConnectAction => ({
    type: RelationshipActionTypes.CONNECT,
    payload: { id, source, target },
  });

  static getById = (state: ElementState) => (id: string): Relationship | null => {
    const relationship = state[id] as IRelationship;
    if (!relationship) return null;

    const RelationshipClass = Relationships[relationship.type];
    if (!RelationshipClass) return null;

    return new RelationshipClass(relationship);
  };

  static read = (state: ModelState): Relationship[] => {
    const relationships = Object.keys(state.elements).reduce<ElementState>((r, e) => {
      if (state.elements[e].type in RelationshipType) return { ...r, [e]: state.elements[e] };
      return r;
    }, {});

    return Object.values(relationships)
      .map<Relationship | null>(element => RelationshipRepository.getById(state.elements)(element.id))
      .filter(notEmpty);
  };
}
