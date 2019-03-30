import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Components } from '../../packages/components';
import { Relationship } from '../../services/relationship/relationship';
import { Point } from './point';

export interface Boundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Boundary {
  constructor(public x: number, public y: number, public width: number, public height: number) {}
}

export function computeBoundingBox(points: Point[]): Boundary {
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
}

export async function computeBoundingBoxForRelationship(relationship: Relationship): Promise<Boundary> {
  const Component = Components[relationship.type];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.visibility = 'none';
  document.body.appendChild(svg);
  const element = createElement(Component, { element: relationship });
  return new Promise((resolve, reject) => {
    render(element, svg, () => {
      let bounds: Boundary = new Boundary(0, 0, 0, 0);
      if (svg.firstElementChild) {
        const parent = svg.getBoundingClientRect() as DOMRect;
        const child = svg.firstElementChild.getBoundingClientRect() as DOMRect;
        bounds = {
          x: child.x - parent.x,
          y: child.y - parent.y,
          width: child.width,
          height: child.height,
        };
      }
      unmountComponentAtNode(svg);
      document.body.removeChild(svg);
      resolve(bounds);
    });
  });
}
