import Relationship from '../../../Relationship';

abstract class ClassAssociation extends Relationship {
  multiplicity = { source: '', target: '' };
  role = { source: '', target: '' };
}

export default ClassAssociation;
