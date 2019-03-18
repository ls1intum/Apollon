import React, { Component } from 'react';
import Element from '../domain/Element';
import Container from '../domain/Container';
import * as Plugins from '../domain/plugins';

class RenderedElement extends Component<Props> {
  render() {
    const { id, elements } = this.props;
    const element = elements.find(element => element.id === id);
    if (!element) return null;
    const Component = (Plugins as any)[`${element.kind}Component`];
    return (
      <svg {...element.bounds} style={{ overflow: 'visible' }}>
        <Component element={element}>
          {element instanceof Container &&
            element.ownedElements.map((child: string) => (
              <RenderedElement id={child} elements={elements} />
            ))}
        </Component>
      </svg>
    );
  }
}

interface Props {
  id: string;
  elements: Element[];
}

export default RenderedElement;
