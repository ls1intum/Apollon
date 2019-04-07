import { CommunicationRelationshipType } from '..';
import { Relationship } from '../../../services/relationship/relationship';

export class CommunicationLink extends Relationship {
  type = CommunicationRelationshipType.CommunicationLink;
}
