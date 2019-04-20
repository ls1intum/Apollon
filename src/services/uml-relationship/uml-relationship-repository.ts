import { RelationshipType as UMLRelationshipType } from '../../packages/relationship-type';
import { Relationships } from '../../packages/relationships';
import { notEmpty } from '../../utils/not-empty';
import { Port } from '../uml-element/port';
import { IUMLElement } from '../uml-element/uml-element';
import { UMLElementState } from '../uml-element/uml-element-types';
import { IUMLRelationship, UMLRelationship } from './uml-relationship';
import { ConnectAction, CreateAction, FlipAction, UMLRelationshipActionTypes } from './uml-relationship-types';

export class UMLRelationshipRepository {
  static isUMLRelationship(element: IUMLElement): element is UMLRelationship {
    return element.type in UMLRelationshipType;
  }

  static create = (relationship: UMLRelationship): CreateAction => ({
    type: UMLRelationshipActionTypes.CREATE,
    payload: { relationship },
  });

  static connect = (id: string, { source, target }: { source?: Port; target?: Port }): ConnectAction => ({
    type: UMLRelationshipActionTypes.CONNECT,
    payload: { id, source, target },
  });

  static flip = (id: string): FlipAction => ({
    type: UMLRelationshipActionTypes.FLIP,
    payload: { id },
  });

  static getById = (state: UMLElementState) => (id: string): UMLRelationship | null => {
    const relationship = state[id] as IUMLRelationship;
    if (!relationship) return null;

    const RelationshipClass = Relationships[relationship.type];
    if (!RelationshipClass) return null;

    return new RelationshipClass(relationship);
  };

  static getByIds = (state: UMLElementState) => (ids: string[]): UMLRelationship[] => {
    return ids.map(UMLRelationshipRepository.getById(state)).filter(notEmpty);
  };

  static read = (state: UMLElementState): UMLRelationship[] => {
    const relationships = Object.keys(state).reduce<UMLElementState>((r, e) => {
      if (state[e].type in UMLRelationshipType) return { ...r, [e]: state[e] };
      return r;
    }, {});

    return Object.values(relationships)
      .map<UMLRelationship | null>(element => UMLRelationshipRepository.getById(state)(element.id))
      .filter(notEmpty);
  };
}
