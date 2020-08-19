import { UMLAssociation } from '../../common/uml-association/uml-association';
import { PetriNetRelationshipType } from '../index';

export class UMLPetriNetArc extends UMLAssociation {
  type = PetriNetRelationshipType.PetriNetArc;
}
