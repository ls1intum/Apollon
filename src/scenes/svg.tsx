import React, { Component } from 'react';
import { Components } from '../packages/components';
import { ElementType } from '../packages/element-type';
import { Elements } from '../packages/elements';
import { Relationships } from '../packages/relationships';
import { Element } from '../services/element/element';
import { ExportOptions, UMLModel } from '../typings';
import { Boundary } from '../utils/geometry/boundary';

interface Props {
  model: UMLModel;
  options?: ExportOptions;
}
interface State {
  bounds: Boundary;
  elements: Element[];
}

const getInitialState = ({ model, options }: Props): State => {
  const keepOriginalSize = (options && options.keepOriginalSize) || false;

  const umlElements = [...model.elements, ...model.relationships];
  const rootElements = [...model.elements.filter(element => !element.owner), ...model.relationships];

  const includeChildren = (ids: Set<string>, include: Set<string>): Set<string> => {
    const result = new Set<string>();
    for (const id of ids) {
      const umlElement = umlElements.find(element => element.id === id);
      if (!umlElement) continue;

      const children = new Set<string>(model.elements.filter(elem => elem.owner === id).map(elem => elem.id));
      if (include.has(id)) {
        result.add(id);
        include = new Set<string>([...include, ...children]);
      }
      includeChildren(children, include).forEach(result.add, result);
    }
    return result;
  };

  const excludeChildren = (ids: Set<string>, exclude: Set<string>): Set<string> => {
    const result = new Set<string>();
    for (const id of ids) {
      const umlElement = umlElements.find(element => element.id === id);
      if (!umlElement) continue;

      const children = new Set<string>(model.elements.filter(element => element.owner === id).map(element => element.id));
      if (!exclude.has(id)) {
        result.add(id);
      } else {
        exclude = new Set<string>([...exclude, ...children]);
      }
      excludeChildren(children, exclude).forEach(result.add, result);
    }
    return result;
  };

  let layout = new Set<string>(umlElements.map(element => element.id));
  if (options && options.include) {
    layout = includeChildren(new Set<string>(rootElements.map(element => element.id)), new Set<string>(options.include));
  }
  if (options && options.exclude) {
    layout = excludeChildren(new Set<string>(rootElements.map(element => element.id)), new Set<string>(options.exclude));
  }

  let elements: Element[] = [
    ...model.elements.map(umlElement => {
      const ElementClazz = Elements[umlElement.type as ElementType];
      return new ElementClazz(umlElement);
    }),
    ...model.relationships.map(umlRelationship => {
      const RelationshipClazz = Relationships[umlRelationship.type];
      const rel = new RelationshipClazz(umlRelationship);
      return rel;
    }),
  ];

  const bounds = computeBoundingBox(elements.filter(element => keepOriginalSize || layout.has(element.id)));
  if (options) {
    const margin = getMargin(options.margin);
    bounds.x -= margin.left;
    bounds.y -= margin.top;
    bounds.width += margin.left + margin.right;
    bounds.height += margin.top + margin.bottom;
  }
  elements = elements
    .filter(element => layout.has(element.id))
    .map(element => {
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
      return element;
    });
  return { bounds, elements };
};

const getMargin = (margin: ExportOptions['margin']): { top: number; right: number; bottom: number; left: number } => {
  if (typeof margin === 'number') {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  const result = { top: 0, right: 0, bottom: 0, left: 0 };
  return Object.assign(result, margin);
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
        xmlnsXlink="http://www.w3.org/1999/xlink"
        fill="white"
      >
        <defs>
          <style>{`
            text {
              fill: black;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            }
            * {
              overflow: visible;
            }
          `}</style>
        </defs>
        {elements.map(element => {
          const ElementComponent = Components[element.type];
          return (
            <svg {...element.bounds} key={element.id} className={element.name}>
              <ElementComponent element={element} />
            </svg>
          );
        })}
      </svg>
    );
  }
}
