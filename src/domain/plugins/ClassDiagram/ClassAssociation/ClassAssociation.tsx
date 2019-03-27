import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Relationship from '../../../Relationship';
import Element from '../../../Element';
import { UMLClassAssociation } from '..';
import * as Plugins from './../../../plugins';
import Boundary from '../../../geo/Boundary';
import Point from '../../../geometry/Point';

abstract class ClassAssociation extends Relationship {
  multiplicity = { source: '', target: '' };
  role = { source: '', target: '' };

  static toUMLRelationship(
    relationship: ClassAssociation
  ): UMLClassAssociation {
    const umlRelationship = Relationship.toUMLRelationship(relationship);
    return {
      ...umlRelationship,
      source: {
        ...umlRelationship.source,
        multiplicity: relationship.multiplicity.source,
        role: relationship.role.source,
      },
      target: {
        ...umlRelationship.target,
        multiplicity: relationship.multiplicity.target,
        role: relationship.role.target,
      },
    };
  }

  static fromUMLRelationship(
    umlRelationship: UMLClassAssociation,
    elements: Element[]
  ): ClassAssociation {
    const relationship = Relationship.fromUMLRelationship(
      umlRelationship,
      elements,
      ClassAssociation
    ) as ClassAssociation;
    relationship.multiplicity = {
      source: umlRelationship.source.multiplicity,
      target: umlRelationship.target.multiplicity,
    };
    relationship.role = {
      source: umlRelationship.source.role,
      target: umlRelationship.target.role,
    };

    const Component = (Plugins as any)[relationship.kind + 'Component'];

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.visibility = 'none';
    document.body.appendChild(svg);
    render(<Component element={relationship} />, svg);
    let bounds: Boundary = new Boundary(0, 0, 0, 0);
    if (svg.firstElementChild) {
      const parent = svg.getBoundingClientRect() as DOMRect;
      const child = svg.firstElementChild.getBoundingClientRect() as DOMRect;
      bounds = {
        x: child.x - parent.x,
        y: child.y - parent.y,
        width: child.width,
        height: child.height,
      }
    }
    unmountComponentAtNode(svg);
    document.body.removeChild(svg);

    relationship.bounds = {
      x: relationship.bounds.x + bounds.x,
      y: relationship.bounds.y + bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
    relationship.path = relationship.path.map(
      point => new Point(point.x - bounds.x, point.y - bounds.y)
    );

    return relationship;
  }
}

export default ClassAssociation;
