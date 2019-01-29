import * as React from 'react';
import * as Plugins from './../../../domain/plugins';

import RelationshipMarkers from './defs/RelationshipMarkers';
import { RenderOptions } from './index';

import RenderedRelationship from './RenderedRelationship';
import { LayoutedDiagram } from '../../../rendering/layouters/diagram';
import ElementComponent from '../../../components/LayoutedElement/ElementComponent';
import Relationship from '../../../domain/Relationship';
import { LayoutedEntity } from '../../layouters/entity';
import Element from '../../../domain/Element';
import Container from '../../../domain/Container';
import { Attribute, Method } from './../../../domain/plugins';

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

        {entities
          .reduce<Element[]>((o: Element[], entity: LayoutedEntity) => {
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
                let [parent, ...children] = container.addElement(
                  method,
                  current
                );
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
            return [...o, element, ...current];
          }, [])
          .map(element => {
            return <ElementComponent key={element.id} element={element} />;
          })}
      </svg>
    );
  }
}

interface Props {
  layoutedDiagram: LayoutedDiagram;
  renderOptions: RenderOptions;
}
