// @ts-ignore
import * as React from 'react';
import { Text } from '../main/utils/svg/text';
import { render as testLibraryRender } from '@testing-library/react';
import * as Apollon from '../main/apollon-editor';
import { ILayer } from '../main/services/layouter/layer';
import testClassDiagram from './test-resources/class-diagram.json';

const testClassDiagramAsSVG = require('./test-resources/class-diagram-as-svg.json') as string;

// has to be overridden, because jsdom does not provide a getBBox() function for SVGTextElements
Text.size = (layer: ILayer, value: string, styles?: Partial<CSSStyleDeclaration>) => {
  return { width: 0, height: 0 };
};

describe('test apollon editor ', () => {
  it('get and set model', () => {
    const { container } = testLibraryRender(<div></div>);
    const editor = new Apollon.ApollonEditor(container, {});
    editor.model = testClassDiagram as any;
    expect(testClassDiagram).toEqual(editor.model);
  });
  it('exportModelAsSvg', () => {
    const { container } = testLibraryRender(<div></div>);
    const editor = new Apollon.ApollonEditor(container, {});
    editor.model = testClassDiagram as any;
    const svg = editor.exportAsSVG();
    expect(svg.svg).toEqual(testClassDiagramAsSVG);
  });
});
