import * as React from 'react';
import * as ReactDOM from 'react-dom';
import RelationshipMarkers from './defs/RelationshipMarkers';
import RenderedDiagram from './RenderedDiagram';
import RenderedRelationship from './RenderedRelationship';
import Svg from './Svg';
import Translate from './Translate';
import { LayoutedEntity } from '../../layouters/entity';
import {
  RelationshipKind,
} from '../../../domain/Relationship';
import { computeBoundingBox, Size } from '../../../domain/geo';
import { UUID } from './../../../domain/utils/uuid';
import { LayoutedDiagram, LayoutedRelationship } from '../../../rendering/layouters/diagram';
import Element from '../../../domain/Element';
import ElementComponent from '../../../components/LayoutedElement/ElementComponent';
import {
  externalToRelationship,
} from '../../../services/Interface/Interface';
import * as Plugins from './../../../domain/plugins';

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
  return {
    svg: renderReactElementToString(<svg />),
    size: {
      width: 0,
      height: 0,
    },
  };
  // const elements: Element[] = layoutedEntityToElements(entity);
  // let { x, y, width, height } = elements[0].bounds;

  // width = width + 2;
  // height = height + 2;

  // const svg = renderReactElementToString(
  //   <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
  //     <Translate dx={-x + 1} dy={-y + 1}>
  //       {renderOptions.shouldRenderElement(elements[0].id) &&
  //         elements
  //           .filter(e => renderOptions.shouldRenderElement(e.id))
  //           .map(e => <ElementComponent key={e.id} element={e} />)}
  //     </Translate>
  //   </Svg>
  // );

  // return {
  //   svg,
  //   size: {
  //     width,
  //     height,
  //   },
  // };
}

export function renderRelationshipToSVG(
  layoutedRelationship: LayoutedRelationship,
  renderOptions: RenderOptions
): RenderedSVG {
  return {
    svg: renderReactElementToString(<svg />),
    size: {
      width: 0,
      height: 0,
    },
  };
  // const PADDING = 50; // quick fix for horizontal associations so that multiplicities and associations are not cutted off
  // // TODO: take the text of multiplicity and role of both relationship ends into account when computing the bounding box of layouted relationships, otherwise they might be cut off

  // const boundingBox = computeBoundingBox(layoutedRelationship.path);

  // const width = boundingBox.width + PADDING;
  // const height = boundingBox.height + PADDING;

  // const dx = -boundingBox.x + PADDING / 2;
  // const dy = -boundingBox.y + PADDING / 2;

  // let kind = 'BidirectionalAssociation';
  // if (layoutedRelationship.relationship.kind === RelationshipKind.ClassAggregation) {
  //   kind = 'Aggregation';
  // } else if (
  //   layoutedRelationship.relationship.kind ===
  //   RelationshipKind.ClassBidirectional
  // ) {
  //   kind = 'BidirectionalAssociation';
  // } else if (
  //   layoutedRelationship.relationship.kind ===
  //   RelationshipKind.ClassUnidirectional
  // ) {
  //   kind = 'UnidirectionalAssociation';
  // } else if (
  //   layoutedRelationship.relationship.kind === RelationshipKind.ClassComposition
  // ) {
  //   kind = 'Composition';
  // } else if (
  //   layoutedRelationship.relationship.kind === RelationshipKind.ClassDependency
  // ) {
  //   kind = 'Dependency';
  // } else if (
  //   layoutedRelationship.relationship.kind === RelationshipKind.ClassInheritance
  // ) {
  //   kind = 'Inheritance';
  // } else if (
  //   layoutedRelationship.relationship.kind === RelationshipKind.ClassRealization
  // ) {
  //   kind = 'Realization';
  // }

  // const Component = (Plugins as any)[`${kind}Component`];
  // const relationship = externalToRelationship(
  //   { ...layoutedRelationship.relationship, straightLine: false },
  //   [],
  //   layoutedRelationship.path
  // );

  // const svg = renderReactElementToString(
  //   <Svg width={width} height={height} fontFamily={renderOptions.fontFamily}>
  //     <defs>
  //       <RelationshipMarkers />
  //     </defs>
  //     <Translate dx={dx} dy={dy}>
  //       <Component element={relationship} path={layoutedRelationship.path} />
  //     </Translate>
  //   </Svg>
  // );

  // return {
  //   svg,
  //   size: {
  //     width,
  //     height,
  //   },
  // };
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
