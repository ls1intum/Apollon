import Element, { IElement } from './../Element';
import Port, { Connection } from '../Port';
import RelationshipKind from '../plugins/RelationshipKind';
import { UMLRelationship } from '../..';
import Boundary from '../geo/Boundary';
import Point from '../geometry/Point';

export interface IRelationship extends IElement {

}

abstract class Relationship extends Element {
  static features = { ...Element.features, straight: false };

  abstract readonly type: RelationshipKind;

  path: { x: number; y: number }[] = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  constructor(name: string, public source: Port, public target: Port) {
    super({ name });
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

    const { straight } = Clazz.features;

    const points = Connection.computePath(
      { bounds: sourceRect, direction: umlRelationship.source.direction },
      { bounds: targetRect, direction: umlRelationship.target.direction },
      { isStraight: straight }
    );
    let path = points.map(point => new Point(point.x, point.y));
    const x = Math.min(...path.map(point => point.x));
    const y = Math.min(...path.map(point => point.y));
    const width = Math.max(Math.max(...path.map(point => point.x)) - x, 1);
    const height = Math.max(Math.max(...path.map(point => point.y)) - y, 1);
    const bounds = { x, y, width, height };
    path = path.map(point => new Point(point.x - x, point.y - y));

    return Object.setPrototypeOf(
      {
        id: umlRelationship.id,
        name: umlRelationship.name,
        type: umlRelationship.type,
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
