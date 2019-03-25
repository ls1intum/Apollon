import React, { Component } from 'react';
import { State as ReduxState } from './../components/Store';
import { ExportOptions } from '..';
import Element from '../domain/Element';
import Container from '../domain/Container';
import Relationship from '../domain/Relationship';
import Boundary from '../domain/geo/Boundary';
import * as Plugins from './../domain/plugins';

type Props = { state: ReduxState; options?: ExportOptions };
type State = { bounds: Boundary; elements: Element[] };

const getInitialState = ({ state, options }: Props): State => {
  const keepOriginalSize = (options && options.keepOriginalSize) || false;

  const filter = (
    ids: string[],
    include?: string[],
    exclude?: string[]
  ): string[] => {
    const result: string[] = [];
    for (const id of ids) {
      const element = Object.setPrototypeOf(
        state.elements[id],
        (Plugins as any)[state.elements[id].kind].prototype
      );
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

  let bounds = computeBoundingBox(
    elements.filter(element => keepOriginalSize || layout.includes(element.id))
  );
  if (options && options.margin) {
    bounds.x -= options.margin;
    bounds.y -= options.margin;
    bounds.width += options.margin * 2;
    bounds.height += options.margin * 2;
  }

  elements = elements
    .filter(element => layout.includes(element.id))
    .map(element =>
      Object.setPrototypeOf(
        {
          ...element,
          bounds: {
            ...element.bounds,
            x: element.bounds.x - bounds.x,
            y: element.bounds.y - bounds.y,
          },
        },
        (Plugins as any)[element.kind].prototype
      )
    );
  return { bounds, elements };
};

const normalizeState = (state: ReduxState): Element[] => {
  let elements: Element[] = state.diagram.ownedElements
    .map(id => state.elements[id])
    .map(element =>
      Object.setPrototypeOf(element, (Plugins as any)[element.kind].prototype)
    );

  const positionChildren = (element: Element): Element[] => {
    if (element instanceof Container) {
      const children = element.ownedElements.map(id =>
        Object.setPrototypeOf(
          {
            ...state.elements[id],
            bounds: {
              ...state.elements[id].bounds,
              x: state.elements[id].bounds.x + element.bounds.x,
              y: state.elements[id].bounds.y + element.bounds.y,
            },
          },
          (Plugins as any)[state.elements[id].kind].prototype
        )
      );
      return [
        ...children,
        ...children.reduce<Element[]>(
          (a, e) => [...a, ...positionChildren(e)],
          []
        ),
      ];
    }
    return [];
  };

  elements = [
    ...elements,
    ...elements.reduce<Element[]>((a, e) => [...a, ...positionChildren(e)], []),
  ];

  const relationships: Relationship[] = state.diagram.ownedRelationships
    .map(id => state.elements[id])
    .map(element =>
      Object.setPrototypeOf(element, (Plugins as any)[element.kind].prototype)
    );
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

    return (
      <svg
        width={bounds.width + 1}
        height={bounds.height + 1}
        xmlns="http://www.w3.org/2000/svg"
        fill="white"
      >
        <defs>
          <style>{`text { fill: black } * { overflow: visible; }`}</style>
        </defs>
        {elements.map(element => {
          const Component = (Plugins as any)[`${element.kind}Component`];
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
