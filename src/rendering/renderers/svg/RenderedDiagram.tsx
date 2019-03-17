import * as React from 'react';

import RelationshipMarkers from './defs/RelationshipMarkers';
import { RenderOptions } from './index';

import RenderedRelationship from './RenderedRelationship';
import { LayoutedDiagram } from '../../../rendering/layouters/diagram';
import ElementComponent from '../../../components/LayoutedElement/ElementComponent';
import Element from '../../../domain/Element';

export default class RenderedDiagram extends React.Component<Props> {
  render() {
    const { layoutedDiagram, renderOptions } = this.props;
    const { entities, relationships, size } = layoutedDiagram;
    const { width, height } = size;

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        fontFamily={renderOptions.fontFamily}
        fontSize="16px"
        fill="white"
      >
        <defs>
          <style>{`text { fill: black }`}</style>
          <RelationshipMarkers />
          {/* <ClipPaths entities={entities} /> */}
        </defs>

        <rect x="0" y="0" width={width} height={height} fill="white" />

        {relationships.map(({ relationship, path }) => (
          <RenderedRelationship
            key={relationship.id}
            relationship={relationship}
            path={path}
            renderOptions={renderOptions}
          />
        ))}

        {/* {entities
          .filter(e => renderOptions.shouldRenderElement(e.id))
          .reduce<Element[]>((xs, entity) => [...xs, ...layoutedEntityToElements(entity)], [])
          .filter(e => renderOptions.shouldRenderElement(e.id))
          .map(element => {
            return <ElementComponent key={element.id} element={element} />;
          })} */}
      </svg>
    );
  }
}

interface Props {
  layoutedDiagram: LayoutedDiagram;
  renderOptions: RenderOptions;
}
