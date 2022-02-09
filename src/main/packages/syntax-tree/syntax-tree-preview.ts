import { ILayer } from '../../services/layouter/layer.js';
import { IBoundary } from '../../utils/geometry/boundary.js';
import { ComposePreview, PreviewElement } from '../compose-preview.js';
import { SyntaxTreeTerminal } from './syntax-tree-terminal/syntax-tree-terminal.js';
import { SyntaxTreeNonterminal } from './syntax-tree-nonterminal/syntax-tree-nonterminal.js';

export const composeSyntaxTreePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 80 * scale, height: 30 * scale };

  elements.push(new SyntaxTreeNonterminal({ name: '', bounds: defaultBounds }));

  elements.push(new SyntaxTreeTerminal({ name: '', bounds: defaultBounds }));

  return elements;
};
