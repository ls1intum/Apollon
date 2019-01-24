import { LayoutedEntity, layoutEntity } from './entity';
import { computeRelationshipPath } from './relationship';
import { Relationship } from '../../domain/Relationship';
import Element from './../../domain/Element';
import { computeBoundingBox, Point, Rect, Size } from '../../domain/geo';
import { flatten } from '../../domain/utils';
import { UUID } from './../../domain/utils/uuid';

export interface UMLModel {
  entities: Element[];
  relationships: Relationship[];
}

export interface LayoutedDiagram {
  size: Size;
  entities: Element[];
  relationships: LayoutedRelationship[];
}

export interface LayoutedRelationship {
  relationship: Relationship;
  path: Point[];
}

export interface LayoutOptions {
  outerPadding: number;
}

export function layoutDiagram(
  diagram: UMLModel,
  layoutOptions: LayoutOptions
): LayoutedDiagram {
  const { entities, relationships } = diagram;
  const { outerPadding } = layoutOptions;

  // Convert relative to absolute positioning for child elements
  let elements = entities.slice().map(e => {
    if (!e.owner) return e;
    let owner: string | null = e.owner;
    let { x, y } = e.bounds;
    while (owner) {
      const parent = entities.find(e => e.id === owner)!;
      x += parent.bounds.x;
      y += parent.bounds.y;
      owner = parent.owner;
    }
    return {
      ...e,
      bounds: {
        ...e.bounds,
        x,
        y,
      },
    };
  });
  console.log(entities);
  diagram.entities = elements;

  const relationshipPaths = computeRelationshipPaths(diagram);
  const boundingBox = computeDiagramBoundingBox(diagram, relationshipPaths);

  const translateWithinBoundingBox = (point: Point): Point => ({
    x: point.x - boundingBox.x + outerPadding,
    y: point.y - boundingBox.y + outerPadding,
  });

  return {
    size: {
      width: boundingBox.width + 2 * outerPadding,
      height: boundingBox.height + 2 * outerPadding,
    },
    entities: elements.map(entity => ({
      ...entity,
      bounds: {
        ...entity.bounds,
        ...translateWithinBoundingBox(entity.bounds),
      },
    })),
    relationships: relationships.map(relationship => ({
      relationship,
      path: relationshipPaths
        .get(relationship.id)!
        .map(translateWithinBoundingBox),
    })),
  };
}

export function computeDiagramBoundingBox(
  diagram: UMLModel,
  relationshipPaths: Map<UUID, Point[]>
): Rect {
  const { entities, relationships } = diagram;

  const points = flatten([
    flatten(entities.map(getEntityBoundingPoints)),
    flatten(
      relationships.map(relationship => relationshipPaths.get(relationship.id)!)
    ),
  ]);

  return computeBoundingBox(points);
}

function getEntityBoundingPoints(entity: Element): Point[] {
  const { x, y, width, height } = entity.bounds;

  const topLeftCorner: Point = { x, y };

  const bottomRightCorner: Point = {
    x: x + width,
    y: y + height,
  };

  return [topLeftCorner, bottomRightCorner];
}

export function computeRelationshipPaths(
  diagram: UMLModel
): Map<UUID, Point[]> {
  const relationshipPaths = diagram.relationships.map<[UUID, Point[]]>(
    relationship => {
      const source = diagram.entities.find(
        e => e.id === relationship.source.entityId
      )!;
      const target = diagram.entities.find(
        e => e.id === relationship.target.entityId
      )!;

      const sourceRect = { ...source.bounds };
      const targetRect = { ...target.bounds };

      const relationshipPath = computeRelationshipPath(
        sourceRect,
        relationship.source.edge,
        relationship.source.edgeOffset,
        targetRect,
        relationship.target.edge,
        relationship.target.edgeOffset,
        relationship.straightLine
      );

      return [relationship.id, relationshipPath];
    }
  );

  return new Map(relationshipPaths);
}
