import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';
import { ExternalState } from '../services/Interface/ExternalState';
import { mapExternalToInternalState } from '../services/Interface/Interface';
import Element from '../domain/Element';
import Boundary from '../domain/geo/Boundary';
import { createStore } from 'redux';
import { EditorMode, ApollonMode } from '../services/EditorService';
import RenderedElement from './RenderedElement';

export interface RenderOptions {
  shouldRenderElement: (id: string) => boolean;
}
export interface SVG {
  svg: string;
  size: {
    width: number;
    height: number;
  };
}

class Renderer {
  static exportDiagram(external: ExternalState, options: RenderOptions): SVG {
    const state = mapExternalToInternalState(external);
    const elements = Object.values(state.elements).filter(element =>
      options.shouldRenderElement(element.id)
    );
    return Renderer.exportElements(elements);
  }

  static exportElements(elements: Element[]): SVG {
    const bounds = Renderer.computeBoundingBox(elements);
    const layouted = elements
      .filter(e => !e.owner)
      .map(e => {
        e.bounds.x -= bounds.x;
        e.bounds.y -= bounds.y;
        return e;
      });

    return {
      svg: Renderer.renderReactElementToString(
        <svg
          width={bounds.width}
          height={bounds.height}
          xmlns="http://www.w3.org/2000/svg"
          fill="white"
        >
          <defs>
            <style>{`text { fill: black }`}</style>
          </defs>
          {layouted.map(element => (
            <RenderedElement
              key={element.id}
              id={element.id}
              elements={elements}
            />
          ))}
        </svg>
      ),
      size: { width: bounds.width, height: bounds.height },
    };
  }

  static computeBoundingBox(elements: Element[]): Boundary {
    const x = Math.min(...elements.map(e => e.bounds.x));
    const y = Math.min(...elements.map(e => e.bounds.y));
    const width =
      Math.max(...elements.map(e => e.bounds.x + e.bounds.width)) - x;
    const height =
      Math.max(...elements.map(e => e.bounds.y + e.bounds.height)) - y;
    return { x, y, width, height };
  }

  static renderReactElementToString(element: JSX.Element): string {
    // Render our React element into a <div>
    const container = document.createElement('div');
    render(element, container);

    // Grab the rendered inner HTML as a string
    const { innerHTML } = container;

    // Unmount the React application
    unmountComponentAtNode(container);

    return innerHTML;
  }
}

export default Renderer;
