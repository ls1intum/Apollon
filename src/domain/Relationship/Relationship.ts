import Element from './../Element';
import Port, { Connection } from '../Port';
import RelationshipKind from '../plugins/RelationshipKind';
import { UMLRelationship } from '../..';
import Boundary from '../geo/Boundary';
import Point from '../geometry/Point';

abstract class Relationship extends Element {
  static features = { ...Element.features, straight: false };

  abstract readonly kind: RelationshipKind;

  readonly base: string = 'Relationship';

  path: { x: number; y: number }[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  constructor(name: string, public source: Port, public target: Port) {
    super(name);
  }

  static toUMLRelationship(relationship: Relationship): UMLRelationship {
    return {
      id: relationship.id,
      name: relationship.name,
      type: relationship.kind,
      source: relationship.source,
      target: relationship.target,
      path: relationship.path,
      bounds: relationship.bounds,
    };
  }

  static fromUMLRelationship<T extends typeof Relationship>(
    umlRelationship: UMLRelationship,
    elements: Element[],
    Clazz: T
  ): Relationship {
    let current: Element = elements.find(
      e => e.id === umlRelationship.source.element
    )!;
    let sourceRect: Boundary = { ...current.bounds };
    while (current.owner) {
      current = elements.find(e => e.id === current.owner)!;
      sourceRect = {
        ...sourceRect,
        x: sourceRect.x + current.bounds.x,
        y: sourceRect.y + current.bounds.y,
      };
    }

    current = elements.find(e => e.id === umlRelationship.target.element)!;
    let targetRect: Boundary = { ...current.bounds };
    while (current.owner) {
      current = elements.find(e => e.id === current.owner)!;
      targetRect = {
        ...targetRect,
        x: targetRect.x + current.bounds.x,
        y: targetRect.y + current.bounds.y,
      };
    }

    const points = Connection.computePath(
      { bounds: sourceRect, direction: umlRelationship.source.direction },
      { bounds: targetRect, direction: umlRelationship.target.direction },
      { isStraight: false }
    );
    let path = points.map(point => new Point(point.x, point.y));
    const x = Math.min(...path.map(point => point.x));
    const y = Math.min(...path.map(point => point.y));
    const width = Math.max(...path.map(point => point.x)) - x;
    const height = Math.max(...path.map(point => point.y)) - y;
    const bounds = { x, y, width, height };
    path = path.map(point => new Point(point.x - x, point.y - y));

    return Object.setPrototypeOf(
      {
        id: umlRelationship.id,
        name: umlRelationship.name,
        kind: umlRelationship.type,
        source: umlRelationship.source,
        target: umlRelationship.target,
        base: 'Relationship',
        path,
        bounds,
      },
      Clazz.prototype
    );
  }
}

export default Relationship;
