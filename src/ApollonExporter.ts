import { createElement } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { UMLModel } from './ApollonEditor';

export interface ExportOptions {
  filter: string[];
}

export interface SVG {
  svg: string;
  size: {
    width: number;
    height: number;
  };
}

export class ApollonExporter {
  constructor(private model: UMLModel) {}

  exportAsSVG(options?: ExportOptions): SVG {
    const element = createElement('svg');
    return {
      svg: this.render(element),
      size: { width: 0, height: 0 },
    };
  }

  private render(element: JSX.Element): string {
    const container = document.createElement('div');
    render(element, container);
    const { innerHTML } = container;
    unmountComponentAtNode(container);
    return innerHTML;
  }
}
