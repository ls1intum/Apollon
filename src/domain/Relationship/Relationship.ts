import Element from './../Element';
import Port from '../Port';
import RelationshipKind from '../plugins/RelationshipKind';

abstract class Relationship extends Element {
  static features = { ...Element.features, straight: false };

  readonly abstract kind: RelationshipKind;

  readonly base: string = 'Relationship';

  path: { x: number; y: number }[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  constructor(name: string, public source: Port, public target: Port) {
    super(name);
  }
}

export default Relationship;
