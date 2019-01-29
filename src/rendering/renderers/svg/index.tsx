import * as React from 'react';
import * as ReactDOM from 'react-dom';
import RelationshipMarkers from './defs/RelationshipMarkers';
import RenderedDiagram from './RenderedDiagram';
import RenderedEntity from './RenderedEntity';
import RenderedRelationship from './RenderedRelationship';
import Svg from './Svg';
import Translate from './Translate';
import { LayoutedEntity } from '../../layouters/entity';
import { LayoutedRelationship } from '../../../domain/Relationship';
import { computeBoundingBox, Size } from '../../../domain/geo';
import { UUID } from './../../../domain/utils/uuid';
import { LayoutedDiagram } from '../../../rendering/layouters/diagram';
import Element from '../../../domain/Element';
import ElementComponent from '../../../components/LayoutedElement/ElementComponent';
import * as Plugins from './../../../domain/plugins';
import Container from '../../../domain/Container';
import { Attribute, Method } from './../../../domain/plugins';

export interface RenderOptions {
  shouldRenderElement: (id: UUID) => boolean;
  fontFamily: string;
}

export interface RenderedSVG {
  svg: string;
  size: Size;
}

export function renderDiagramToSVG(
  layoutedDiagram: LayoutedDiagram,
  renderOptions: RenderOptions
): RenderedSVG {
  const svg = renderReactElementToString(
    <RenderedDiagram
      layoutedDiagram={layoutedDiagram}
      renderOptions={renderOptions}
    />
  );

  return {
    svg,
    size: layoutedDiagram.size,
  };
}

export function renderEntityToSVG(
  entity: LayoutedEntity,
  renderOptions: RenderOptions
): RenderedSVG {
  let current: Element[] = [];
  let element = {
    ...new (Plugins as any)[entity.kind](entity.name),
    id: entity.id,
    bounds: {
      x: entity.position.x,
      y: entity.position.y,
      width: entity.size.width,
      height: entity.size.height,
    },
    selected: false,
    interactive: false,
    owner: null,
  };
  element = Object.setPrototypeOf(
    element,
    (Plugins as any)[element.kind].prototype
  );
  if (
    ['Class', 'AbstractClass', 'Enumeration', 'Interface'].includes(
      element.kind
    )
  ) {
    const container = element as Container;
    for (const a of entity.attributes) {
      const attr: Attribute = Object.setPrototypeOf(
        {
          ...new Attribute(a.name),
          id: a.id,
        },
        Attribute.prototype
      );
      let [parent, ...children] = container.addElement(attr, current);
      element = parent;
      current = children;
    }
    for (const m of entity.methods) {
      const method: Method = Object.setPrototypeOf(
        {
          ...new Method(m.name),
          id: m.id,
        },
        Method.prototype
      );
      let [parent, ...children] = container.addElement(method, current);
      element = parent;
      current = children;
    }
    container.ownedElements = [];
    current = current.map(c => ({
      ...c,
      bounds: {
        ...c.bounds,
        x: c.bounds.x + container.bounds.x,
        y: c.bounds.y + container.bounds.y,
      },
    }));
  }
  const elements = [element, ...current];
  let { x, y, width, height } = element.bounds;

  width = width + 2;
  height = height + 2;

  const svg = renderReactElementToString(
    <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
      <Translate dx={-x + 1} dy={-y + 1}>
        {elements.map(e => (
          <ElementComponent key={e.id} element={e} />
        ))}
      </Translate>
    </Svg>
  );

  return {
    svg,
    size: {
      width,
      height,
    },
  };
}

export function renderRelationshipToSVG(
  layoutedRelationship: LayoutedRelationship,
  renderOptions: RenderOptions
): RenderedSVG {
  const PADDING = 50; // quick fix for horizontal associations so that multiplicities and associations are not cutted off
  // TODO: take the text of multiplicity and role of both relationship ends into account when computing the bounding box of layouted relationships, otherwise they might be cut off

  const boundingBox = computeBoundingBox(layoutedRelationship.path);

  const width = boundingBox.width + PADDING;
  const height = boundingBox.height + PADDING;

  const dx = -boundingBox.x + PADDING / 2;
  const dy = -boundingBox.y + PADDING / 2;

  const svg = renderReactElementToString(
    <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
      <defs>
        <RelationshipMarkers />
      </defs>
      <Translate dx={dx} dy={dy}>
        <RenderedRelationship
          relationship={layoutedRelationship.relationship}
          path={layoutedRelationship.path}
          renderOptions={renderOptions}
        />
      </Translate>
    </Svg>
  );

  return {
    svg,
    size: {
      width,
      height,
    },
  };
}

function renderReactElementToString(element: JSX.Element): string {
  // Render our React element into a <div>
  const container = document.createElement('div');
  ReactDOM.render(element, container);

  // Grab the rendered inner HTML as a string
  const { innerHTML } = container;

  // Unmount the React application
  ReactDOM.unmountComponentAtNode(container);

  return innerHTML;
}
