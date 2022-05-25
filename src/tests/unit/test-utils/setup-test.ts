import { Text } from '../../../main/utils/svg/text';
import { ILayer } from '../../../main/services/layouter/layer';

// has to be overridden, because jsdom does not provide a getBBox() function for SVGTextElements
Text.size = (layer: ILayer, value: string, styles?: Partial<CSSStyleDeclaration>) => {
  return { width: 0, height: 0 };
};
