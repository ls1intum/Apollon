import { Text } from '../../../main/utils/svg/text';
import { ILayer } from '../../../main/services/layouter/layer';

// has to be overridden, because jsdom does not provide a getBBox() function for SVGTextElements
Text.size = (layer: ILayer, value: string, styles?: Partial<CSSStyleDeclaration>) => {
  return { width: 0, height: 0 };
};

// jsdom doesn't implement crypto.randomUUID; provide a light-weight fallback for tests
try {
  const c = (window as any).crypto;
  if (c && typeof c.randomUUID !== 'function') {
    c.randomUUID = () => {
      let dt = Date.now();
      if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        dt += performance.now();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    };
  }
} catch {
  // ignore
}
