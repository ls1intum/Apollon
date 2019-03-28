import { Element, IElement } from '../element/element';
import { Port } from '../element/port';
import { RelationshipType } from '../../packages/relationship-type';
import { UMLRelationship, Direction } from '../../typings';

export interface IRelationship extends IElement {
  type: RelationshipType;
  path: { x: number; y: number }[];
  source: Port;
  target: Port;
}

export abstract class Relationship extends Element implements IRelationship {
  static features = { ...Element.features, straight: false };

  abstract readonly type: RelationshipType;

  path = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  source: Port = {
    element: '',
    direction: Direction.Up,
  };

  target: Port = {
    element: '',
    direction: Direction.Up,
  };

  constructor(values?: IRelationship);
  constructor(values?: UMLRelationship);
  constructor(values?: IRelationship | UMLRelationship);
  constructor(values?: IRelationship | UMLRelationship) {
    super();
    Object.assign(this, values);
  }

  static toUMLRelationship(relationship: Relationship): UMLRelationship {
    return {
      id: relationship.id,
      name: relationship.name,
      type: relationship.type,
      source: relationship.source,
      target: relationship.target,
      path: relationship.path,
      bounds: relationship.bounds,
    };
  }
}
