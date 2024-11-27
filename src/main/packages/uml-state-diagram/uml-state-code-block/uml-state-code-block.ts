import { DeepPartial } from 'redux';
import { StateElementType, StateRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';

export interface IUMLStateCodeBlockElement extends IUMLElement {
  text: string;
  language: string;
  code?: {
    content: string;
    language: string;
    version?: string;
  };
}

export class UMLStateCodeBlock extends UMLElement implements IUMLStateCodeBlockElement {
  type: UMLElementType = StateElementType.StateCodeBlock;
  text: string = '';
  language: string = 'python';
  code?: {
    content: string;
    language: string;
    version?: string;
  };

  constructor(values?: DeepPartial<IUMLStateCodeBlockElement>) {
    super(values && !values.bounds ? { ...values, bounds: { x: 0, y: 0, width: 200, height: 100 } } : values);
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
