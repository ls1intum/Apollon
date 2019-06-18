import { UMLRelationshipType } from '../../packages/uml-relationship-type';
import { UMLRelationships } from '../../packages/uml-relationships';
import { IUMLElement } from '../uml-element/uml-element';
import { IUMLRelationship, UMLRelationship } from './uml-relationship';

export const UMLRelationshipRepository = {
  isUMLRelationship: (element: IUMLElement): element is IUMLRelationship => {
    return element.type in UMLRelationshipType;
  },

  get: (element?: IUMLElement): UMLRelationship | null => {
    if (!element) {
      return null;
    }

    if (UMLRelationshipRepository.isUMLRelationship(element)) {
      const Classifier = UMLRelationships[element.type];

      return new Classifier(element);
    }

    return null;
  },

  // static connect = (
  //   id: string,
  //   { source, target }: { source?: IUMLElementPort; target?: IUMLElementPort },
  // ): ConnectAction => ({
  //   type: UMLRelationshipActionTypes.CONNECT,
  //   payload: { id, source, target },
  // });

  // static flip = (id: string): FlipAction => ({
  //   type: UMLRelationshipActionTypes.FLIP,
  //   payload: { id },
  // });

  // static getById = (state: UMLElementState) => (id: string): UMLRelationship | null => {
  //   const relationship = state[id] as IUMLRelationship;
  //   if (!relationship) return null;

  //   const RelationshipClass = Relationships[relationship.type];
  //   if (!RelationshipClass) return null;

  //   return new RelationshipClass(relationship);
  // };

  // static getByIds = (state: UMLElementState) => (ids: string[]): UMLRelationship[] => {
  //   return ids.map(UMLRelationshipRepository.getById(state)).filter(notEmpty);
  // };

  // static read = (state: UMLElementState): UMLRelationship[] => {
  //   const relationships = Object.keys(state).reduce<UMLElementState>((r, e) => {
  //     if (state[e].type in UMLRelationshipType) return { ...r, [e]: state[e] };
  //     return r;
  //   }, {});

  //   return Object.values(relationships)
  //     .map<UMLRelationship | null>(element => UMLRelationshipRepository.getById(state)(element.id))
  //     .filter(notEmpty);
  // };
};
