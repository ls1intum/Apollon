import { CommunicationMessage, CommunicationRelationshipType, UMLCommunicationLink } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { UMLRelationship as Other } from '../../../typings';

export interface ICommunicationLink extends IUMLRelationship {
  messages: CommunicationMessage[];
}

export class CommunicationLink extends UMLRelationship implements ICommunicationLink {
  type = CommunicationRelationshipType.CommunicationLink;
  messages: CommunicationMessage[] = [];

  constructor(values?: ICommunicationLink);
  constructor(values?: UMLCommunicationLink);
  constructor(values?: IUMLRelationship | Other);
  constructor(values?: ICommunicationLink | UMLCommunicationLink) {
    super(values);
    this.messages = (values && values.messages) || [];
  }

  // static toUMLRelationship(relationship: CommunicationLink): UMLCommunicationLink {
  //   const umlRelationship = UMLRelationship.toUMLRelationship(relationship);
  //   return {
  //     ...umlRelationship,
  //     messages: relationship.messages,
  //   };
  // }
}
