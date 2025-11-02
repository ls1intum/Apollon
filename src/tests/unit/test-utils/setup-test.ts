import { Text } from '../../../main/utils/svg/text';
import { ILayer } from '../../../main/services/layouter/layer';

// has to be overridden, because jsdom does not provide a getBBox() function for SVGTextElements
Text.size = (layer: ILayer, value: string, styles?: Partial<CSSStyleDeclaration>) => {
  return { width: 0, height: 0 };
};

// jsdom does not implement ResizeObserver; mock a minimal no-op implementation for libraries relying on it
if (typeof (window as any).ResizeObserver === 'undefined') {
  (window as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom still lacks native PointerEvent support; provide a minimal polyfill so native
// event listeners relying on pointer events continue to work in unit tests.
if (typeof (window as any).PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);

      const pointerProps: Record<string, unknown> = {
        pointerId: params.pointerId ?? 1,
        width: params.width ?? 1,
        height: params.height ?? 1,
        pressure: params.pressure ?? (params.buttons ? 0.5 : 0),
        tangentialPressure: params.tangentialPressure ?? 0,
        tiltX: params.tiltX ?? 0,
        tiltY: params.tiltY ?? 0,
        twist: params.twist ?? 0,
        pointerType: params.pointerType ?? 'mouse',
        isPrimary: params.isPrimary ?? true,
      };

      Object.keys(pointerProps).forEach((key) => {
        Object.defineProperty(this, key, {
          value: pointerProps[key],
          enumerable: true,
          configurable: true,
        });
      });
    }
  }

  (window as any).PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
