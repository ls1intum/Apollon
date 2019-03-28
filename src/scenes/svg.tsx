import React, { Component } from 'react';
import { ModelState } from '../components/store/model-state';
import { ExportOptions } from '../typings';
import { Element } from '../services/element/element';
import { Container } from '../services/container/container';
import { Relationship, IRelationship } from '../services/relationship/relationship';
import { Boundary } from '../utils/geometry/boundary';
import { Elements } from '../packages/elements';
import { Relationships } from '../packages/relationships';
import { Components } from '../packages/components';
import { ElementType } from '../packages/element-type';
import { RelationshipType } from '../packages/relationship-type';

type Props = { state: ModelState; options?: ExportOptions };
type State = { bounds: Boundary; elements: Element[] };

const getInitialState = ({ state, options }: Props): State => {
  const keepOriginalSize = (options && options.keepOriginalSize) || false;

  const filter = (ids: string[], include?: string[], exclude?: string[]): string[] => {
    const result: string[] = [];
    for (const id of ids) {
      const ElementClazz = Elements[state.elements[id].type as ElementType] || Relationships[state.elements[id].type as RelationshipType];
      const element: Element = new ElementClazz(state.elements[id]);

      if (include && include.includes(id)) {
        result.push(id);
        if (element instanceof Container) {
          result.push(...filter(element.ownedElements, element.ownedElements));
        }
      } else if (include && !include.includes(id)) {
        if (element instanceof Container) {
          result.push(...filter(element.ownedElements, include, exclude));
        }
      } else if (exclude && !exclude.includes(id)) {
        result.push(id);
        if (element instanceof Container) {
          result.push(...filter(element.ownedElements, include, exclude));
        }
      } else if (exclude && exclude.includes(id)) {
      } else {
        if ((!include || !include.length) && (!exclude || !exclude.length)) {
          result.push(id);
          if (element instanceof Container) {
            result.push(...filter(element.ownedElements, include, exclude));
          }
        }
      }
    }
    return result;
  };

  const layout: string[] = filter(
    [...state.diagram.ownedElements, ...state.diagram.ownedRelationships],
    options && options.include,
    options && options.exclude
  );

  let elements = normalizeState(state);

  let bounds = computeBoundingBox(elements.filter(element => keepOriginalSize || layout.includes(element.id)));
  if (options && options.margin) {
    bounds.x -= options.margin;
    bounds.y -= options.margin;
    bounds.width += options.margin * 2;
    bounds.height += options.margin * 2;
  }

  elements = elements
    .filter(element => layout.includes(element.id))
    .map(element => {
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
      return element;
    });
  return { bounds, elements };
};

const normalizeState = (state: ModelState): Element[] => {
  let elements: Element[] = state.diagram.ownedElements
    .map(id => state.elements[id])
    .map(element => {
      const ElementClazz = Elements[element.type as ElementType];
      return new ElementClazz(element);
    });

  const positionChildren = (element: Element): Element[] => {
    if (element instanceof Container) {
      const children: Element[] = element.ownedElements.map(id => {
        const ElementClazz = Elements[state.elements[id].type as ElementType];
        const child = new ElementClazz(state.elements[id]);
        child.bounds.x += element.bounds.x;
        child.bounds.y += element.bounds.y;
        return child;
      });
      return [...children, ...children.reduce<Element[]>((a, e) => [...a, ...positionChildren(e)], [])];
    }
    return [];
  };

  elements = [...elements, ...elements.reduce<Element[]>((a, e) => [...a, ...positionChildren(e)], [])];

  const relationships: Relationship[] = state.diagram.ownedRelationships
    .map<IRelationship>(id => state.elements[id] as IRelationship)
    .map<Relationship>(element => {
      const RelationshipClazz = Relationships[element.type];
      return new RelationshipClazz(element);
    });

  return [...elements, ...relationships];
};

const computeBoundingBox = (elements: Element[]): Boundary => {
  let x = Math.min(...elements.map(e => e.bounds.x));
  x = x === Infinity ? 0 : x;
  let y = Math.min(...elements.map(e => e.bounds.y));
  y = y === Infinity ? 0 : y;
  let width = Math.max(...elements.map(e => e.bounds.x + e.bounds.width)) - x;
  width = width === -Infinity ? 0 : width;
  let height = Math.max(...elements.map(e => e.bounds.y + e.bounds.height)) - y;
  height = height === -Infinity ? 0 : height;
  return { x, y, width, height };
};

export class Svg extends Component<Props, State> {
  state = getInitialState(this.props);

  render() {
    const { bounds, elements } = this.state;
    console.log(elements);

    return (
      <svg
        width={bounds.width + 1}
        height={bounds.height + 1}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        fill="white"
      >
        <defs>
          <style>{`text { fill: black } * { overflow: visible; }`}</style>
        </defs>
        {elements.map(element => {
          const Component = Components[element.type];
          return (
            <svg {...element.bounds} key={element.id} className={element.name}>
              <Component element={element} />
            </svg>
          );
        })}
      </svg>
    );
  }
}
