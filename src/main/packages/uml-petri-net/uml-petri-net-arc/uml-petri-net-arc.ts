import { PetriNetRelationshipType } from '../index';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';

export class UMLPetriNetArc extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true};
  type = PetriNetRelationshipType.PetriNetArc;
}
