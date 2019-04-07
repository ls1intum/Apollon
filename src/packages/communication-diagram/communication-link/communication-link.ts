import { CommunicationRelationshipType, UMLCommunicationLink } from '..';
import { IRelationship, Relationship } from '../../../services/relationship/relationship';
import { UMLRelationship } from '../../../typings';

export interface ICommunicationLink extends IRelationship {
  messages: string[];
}

export class CommunicationLink extends Relationship implements ICommunicationLink {
  static toUMLRelationship(relationship: CommunicationLink): UMLCommunicationLink {
    const umlRelationship = Relationship.toUMLRelationship(relationship);
    return {
      ...umlRelationship,
      messages: relationship.messages,
    };
  }

  type = CommunicationRelationshipType.CommunicationLink;
  messages: string[] = [];

  constructor(values?: ICommunicationLink);
  constructor(values?: UMLCommunicationLink);
  constructor(values?: IRelationship | UMLRelationship);
  constructor(values?: ICommunicationLink | UMLCommunicationLink) {
    super(values);
    this.messages = (values && values.messages) || [];
  }
}
