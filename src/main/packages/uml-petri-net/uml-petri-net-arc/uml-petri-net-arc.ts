import { PetriNetRelationshipType } from '../index';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { DeepPartial } from 'redux';

export class UMLPetriNetArc extends UMLRelationship {
  static features = { ...UMLRelationship.features, straight: true };
  static defaultMultiplicity = '1';
  type = PetriNetRelationshipType.PetriNetArc;
  name = UMLPetriNetArc.defaultMultiplicity;

  constructor(values?: DeepPartial<IUMLRelationship>) {
    super(values);
    this.name = (values && values.name) || this.name;
  }
}
