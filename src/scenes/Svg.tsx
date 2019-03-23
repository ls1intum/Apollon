import React, { Component } from 'react';
import { State } from './../components/Store';
import { ExportOptions } from '..';
import Element, { ElementRepository } from '../domain/Element';
import Relationship, { RelationshipRepository } from '../domain/Relationship';
import * as Plugins from './../domain/plugins';
import Boundary from '../domain/geo/Boundary';
import Container from '../domain/Container';

type Props = { state: State; options?: ExportOptions };

export class Svg extends Component<Props> {
  normalizeState = (state: State): Element[] => {
    const bounds = this.computeBoundingBox(Object.values(state.elements));

    // let elements: Element[] = ElementRepository.read(state).map(element => {
    //   if (!element.owner) {
    //     element.bounds.x -= bounds.x;
    //     element.bounds.y -= bounds.y;
    //   }
    //   return element;
    // });
    // elements = elements.map(element => {
    //   if (element.owner) {
    //     const owner = elements.find
    //   }
    // })

    let elements: Element[] = state.diagram.ownedElements
      .map(id => ({
        ...state.elements[id],
        bounds: {
          ...state.elements[id].bounds,
          x: state.elements[id].bounds.x - bounds.x,
          y: state.elements[id].bounds.y - bounds.y,
        },
      }))
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
      ...elements.reduce<Element[]>(
        (a, e) => [...a, ...positionChildren(e)],
        []
      ),
    ];

    const relationships: Relationship[] = RelationshipRepository.read(
      state.elements
    ).map(element => {
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
      return element;
    });

    return [...elements, ...relationships];
  };

  computeBoundingBox(elements: Element[]): Boundary {
    const x = Math.min(...elements.map(e => e.bounds.x));
    const y = Math.min(...elements.map(e => e.bounds.y));
    const width =
      Math.max(...elements.map(e => e.bounds.x + e.bounds.width)) - x;
    const height =
      Math.max(...elements.map(e => e.bounds.y + e.bounds.height)) - y;
    return { x, y, width, height };
  }

  render() {
    const { state, options } = this.props;
    const filter: string[] | false = (options && options.filter) || false;
    const elements = this.normalizeState(state);
    return (
      <svg
        width={state.diagram.bounds.width}
        height={state.diagram.bounds.height}
        xmlns="http://www.w3.org/2000/svg"
        fill="white"
      >
        <defs>
          <style>{`text { fill: black } * { overflow: visible; }`}</style>
        </defs>
        {elements
          .filter(element => !filter || filter.includes(element.id))
          .map(element => {
            const Component = (Plugins as any)[`${element.kind}Component`];
            return (
              <svg
                {...element.bounds}
                key={element.id}
                className={element.name}
              >
                <Component element={element} />
              </svg>
            );
          })}
      </svg>
    );
  }
}
