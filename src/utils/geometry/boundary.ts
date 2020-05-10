import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Components } from '../../packages/components';
import { UMLRelationship } from '../../services/uml-relationship/uml-relationship';
import { Point } from './point';

export interface IBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const computeBoundingBox = (points: Point[]): IBoundary => {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const firstPoint = points[0];

  let minX = firstPoint.x;
  let minY = firstPoint.y;

  let maxX = firstPoint.x;
  let maxY = firstPoint.y;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;

    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

export const computeBoundingBoxForElements = (elements: { bounds: IBoundary }[]): IBoundary => {
  if (!elements.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const boundaries: IBoundary[] = elements.map<IBoundary>(element => ({ ...element.bounds }));
  const x = Math.min(...boundaries.map(bounds => bounds.x));
  const y = Math.min(...boundaries.map(bounds => bounds.y));
  const width = Math.max(...boundaries.map(bounds => bounds.x + bounds.width)) - x;
  const height = Math.max(...boundaries.map(bounds => bounds.y + bounds.height)) - y;
  return { x, y, width, height };
};

export const computeBoundingBoxForRelationship = (
  container: SVGSVGElement,
  relationship: UMLRelationship,
): IBoundary => {
  const Component = Components[relationship.type];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('x', `${relationship.bounds.x}`);
  svg.setAttribute('y', `${relationship.bounds.y}`);
  svg.style.visibility = 'none';
  container.appendChild(svg);
  const element = createElement(Component, { element: relationship });
  render(element, svg);

  const parent = container.getBoundingClientRect();
  const child = svg.getBoundingClientRect();
  const bounds = { x: child.left - parent.left, y: child.top - parent.top, width: child.width, height: child.height };

  unmountComponentAtNode(svg);
  container.removeChild(svg);

  return bounds;
};
