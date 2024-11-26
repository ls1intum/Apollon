import { ColorLegend, IColorLegendElement } from './color-legend';

export const ColorLegendElementType = {
  ColorLegend: 'ColorLegend',
} as const;

export type ColorLegendElement = ColorLegend;
export type { IColorLegendElement };
