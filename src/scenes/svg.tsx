import React, { Component } from 'react';
import { DeepPartial } from 'redux';
import { defaults, Styles } from '../components/theme/styles';
import { Components } from '../packages/components';
import { UMLElementType } from '../packages/uml-element-type';
import { UMLElements } from '../packages/uml-elements';
import { UMLRelationshipType } from '../packages/uml-relationship-type';
import { UMLRelationships } from '../packages/uml-relationships';
import { ILayer } from '../services/layouter/layer';
import { UMLContainer } from '../services/uml-container/uml-container';
import { UMLElement } from '../services/uml-element/uml-element';
import { UMLRelationship } from '../services/uml-relationship/uml-relationship';
import * as Apollon from '../typings';
import { computeBoundingBoxForElements, IBoundary } from '../utils/geometry/boundary';
import { Point } from '../utils/geometry/point';
import { update } from '../utils/update';
import { Style } from './svg-styles';

type Props = {
  model: Apollon.UMLModel;
  options?: Apollon.ExportOptions;
  styles?: DeepPartial<Styles>;
};

type State = {
  bounds: IBoundary;
  elements: UMLElement[];
};

const includeChildren = (
  elements: { [id: string]: UMLElement },
  ids: Set<string>,
  include: Set<string>,
): Set<string> => {
  const result = new Set<string>();
  for (const id of ids) {
    const element = elements[id];
    if (!element) continue;

    const children = new Set<string>(UMLContainer.isUMLContainer(element) ? element.ownedElements : []);
    if (include.has(id)) {
      result.add(id);
      include = new Set<string>([...include, ...children]);
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    includeChildren(elements, children, include).forEach(result.add, result);
  }
  return result;
};

const excludeChildren = (
  elements: { [id: string]: UMLElement },
  ids: Set<string>,
  exclude: Set<string>,
): Set<string> => {
  const result = new Set<string>();
  for (const id of ids) {
    const element = elements[id];
    if (!element) continue;

    const children = new Set<string>(UMLContainer.isUMLContainer(element) ? element.ownedElements : []);
    if (!exclude.has(id)) {
      result.add(id);
    } else {
      exclude = new Set<string>([...exclude, ...children]);
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    excludeChildren(elements, children, exclude).forEach(result.add, result);
  }
  return result;
};

const getInitialState = ({ model, options }: Props): State => {
  const layer: ILayer = {
    layer: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    origin: (): Point => new Point(),
    snap: (point: Point): Point => point,
  };
  const apollonElements = model.elements;
  const apollonRelationships = model.relationships;

  const deserialize = (apollonElement: Apollon.UMLElement): UMLElement[] => {
    const element = new UMLElements[apollonElement.type]();
    const apollonChildren: Apollon.UMLElement[] = UMLContainer.isUMLContainer(element)
      ? apollonElements.filter(child => child.owner === apollonElement.id)
      : [];

    element.deserialize(apollonElement, apollonChildren);
    const children: UMLElement[] = apollonChildren.reduce<UMLElement[]>(
      (acc, val) => [...acc, ...deserialize(val)],
      [],
    );

    const [root, ...updates] = element.render(layer, children) as UMLElement[];
    updates.map(x => {
      const original = apollonChildren.find(y => y.id === x.id);
      if (!original) {
        return x;
      }
      x.bounds.x = original.bounds.x;
      x.bounds.y = original.bounds.y;
      return x;
    });

    return [root, ...updates];
  };

  const elements = apollonElements
    .filter(element => !element.owner)
    .reduce<UMLElement[]>((acc, val) => [...acc, ...deserialize(val)], []);

  const relationships = apollonRelationships.map<UMLRelationship>(apollonRelationship => {
    const relationship = new UMLRelationships[apollonRelationship.type]();
    relationship.deserialize(apollonRelationship);
    return relationship;
  });

  const elementState = [...elements, ...relationships].reduce<{ [id: string]: UMLElement }>(
    (acc, val) => ({ ...acc, [val.id]: val }),
    {},
  );
  const roots = Object.values(elementState).filter(element => !element.owner);

  let layout = new Set<string>(Object.values(elementState).map(x => x.id));
  if (options && options.include) {
    layout = includeChildren(
      elementState,
      new Set<string>(roots.map(element => element.id)),
      new Set<string>(options.include),
    );
  }
  if (options && options.exclude) {
    layout = excludeChildren(
      elementState,
      new Set<string>(roots.map(element => element.id)),
      new Set<string>(options.exclude),
    );
  }

  const keepOriginalSize = (options && options.keepOriginalSize) || false;

  const bounds = computeBoundingBoxForElements(
    Object.values(elementState).filter(element => keepOriginalSize || layout.has(element.id)),
  );

  if (options) {
    const margin = getMargin(options.margin);
    bounds.x -= margin.left;
    bounds.y -= margin.top;
    bounds.width += margin.left + margin.right;
    bounds.height += margin.top + margin.bottom;
  }

  const state = Object.values(elementState)
    .filter(element => layout.has(element.id))
    .map(element => {
      element.bounds.x -= bounds.x;
      element.bounds.y -= bounds.y;
      return element;
    });

  return {
    elements: state,
    bounds,
  };
};

const getMargin = (
  margin: Apollon.ExportOptions['margin'],
): { top: number; right: number; bottom: number; left: number } => {
  if (typeof margin === 'number') {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  const result = { top: 0, right: 0, bottom: 0, left: 0 };
  return Object.assign(result, margin);
};

export class Svg extends Component<Props, State> {
  state = getInitialState(this.props);

  render() {
    const { bounds, elements } = this.state;
    const theme: Styles = update(defaults, this.props.styles || {});

    return (
      <svg
        width={bounds.width + 1}
        height={bounds.height + 1}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        fillOpacity={0}
      >
        <defs>
          <style>{(Style[0] as any)({ theme })}</style>
        </defs>
        {elements.map((element, index) => {
          const ElementComponent = Components[element.type as UMLElementType | UMLRelationshipType];
          return (
            <svg {...element.bounds} key={element.id} className={element.name}>
              <ElementComponent key={index} element={element} />
            </svg>
          );
        })}
      </svg>
    );
  }
}
