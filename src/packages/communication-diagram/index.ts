import { UMLRelationship } from '../../typings';

export enum CommunicationRelationshipType {
  CommunicationLink = 'CommunicationLink',
}

export interface UMLCommunicationLink extends UMLRelationship {
  messages: string[];
}
