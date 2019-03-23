import React, { Component } from 'react';
import { State as ReduxState } from './../components/Store';
import { ExportOptions } from '..';
import Element from '../domain/Element';
import Relationship from '../domain/Relationship';
import * as Plugins from './../domain/plugins';
import Boundary from '../domain/geo/Boundary';
import Container from '../domain/Container';

type Props = { state: ReduxState; options?: ExportOptions };
type State = { bounds: Boundary; elements: Element[] };

const getInitialState = ({ state, options }: Props): State => {
  const filter = getFilter({ state, options });
  const keepOriginalSize = (options && options.keepOriginalSize) || false;
  let elements = normalizeState(state);
  const bounds = computeBoundingBox(
    elements.filter(element => keepOriginalSize || filter.includes(element.id))
  );
  elements = elements
    .filter(element => filter.includes(element.id))
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
      const children = element.ownedElements.map(id => ({
        ...state.elements[id],
        bounds: {
          ...state.elements[id].bounds,
          x: state.elements[id].bounds.x + element.bounds.x,
          y: state.elements[id].bounds.y + element.bounds.y,
        },
      }));
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

const getFilter = ({ state, options }: Props): string[] => {
  if (!options || !options.filter) return [...Object.keys(state.elements)];
  const children = (id: string): string[] => {
    if (
      (Plugins as any)[state.elements[id].kind].prototype instanceof Container
    ) {
      const elements = (state.elements[id] as Container).ownedElements;
      return elements.reduce<string[]>((a, e) => [...a, e, ...children(e)], []);
    }
    return [];
  };
  return options.filter.reduce<string[]>(
    (a, e) => [...a, e, ...children(e)],
    []
  );
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
