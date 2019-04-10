import { UMLRelationship } from '../../typings';

export enum CommunicationRelationshipType {
  CommunicationLink = 'CommunicationLink',
}

export interface CommunicationMessage {
  name: string;
  direction: 'source' | 'target';
}

export interface UMLCommunicationLink extends UMLRelationship {
  messages: CommunicationMessage[];
}
