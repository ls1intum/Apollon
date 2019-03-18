import Relationship from '../../../Relationship';

abstract class ClassAssociation extends Relationship {
  multiplicity = { source: '1', target: '0..*' };
  role = { source: 'parent', target: 'child' };
}

export default ClassAssociation;
