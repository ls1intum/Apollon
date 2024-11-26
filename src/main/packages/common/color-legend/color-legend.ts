import { DeepPartial } from 'redux';
import { ColorLegendElementType } from '.';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';

export interface IColorLegendElement extends IUMLElement {
  text: string;
  language: string;
  code?: {
    content: string;
    language: string;
    version?: string;
  };
}

export class ColorLegend extends UMLElement implements IColorLegendElement {
  type: UMLElementType = ColorLegendElementType.ColorLegend;
  text: string = '';
  language: string = 'typescript';
  code?: {
    content: string;
    language: string;
    version?: string;
  };

  constructor(values?: DeepPartial<IColorLegendElement>) {
    super(values && !values.bounds ? { ...values, bounds: { x: 0, y: 0, width: 300, height: 200 } } : values);
    if (values?.text) {
      this.text = values.text;
    }
    if (values?.language) {
      this.language = values.language;
    }
    if (values?.code) {
      this.code = values.code;
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.text,
      language: this.language,
      code: this.code
    };
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
