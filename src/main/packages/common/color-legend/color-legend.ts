import { DeepPartial } from 'redux';
import { ColorLegendElementType } from '.';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';

export interface IColorLegendElement extends IUMLElement {
  text: string;
}

export class ColorLegend extends UMLElement implements IColorLegendElement {
  type: UMLElementType = ColorLegendElementType.ColorLegend;
  text: string = '';

  constructor(values?: DeepPartial<IColorLegendElement>) {
    super(values && !values.bounds ? { ...values, bounds: { x: 0, y: 0, width: 160, height: 100 } } : values);
    if (values?.text) {
      this.text = values.text;
    }
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
