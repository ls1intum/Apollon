import { ILayer } from '../../services/layouter/layer';

export class Text {
  static width = (layer: ILayer, value: string): number => {
    const svg = layer.layer;
    if (!svg) return 0;

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.style.visibility = 'hidden';
    text.appendChild(document.createTextNode(value));
    svg.appendChild(text);

    const width = text.getComputedTextLength();
    svg.removeChild(text);
    return width;
  };
}
