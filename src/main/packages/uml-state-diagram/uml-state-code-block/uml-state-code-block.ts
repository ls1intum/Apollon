import { DeepPartial } from 'redux';
import { StateElementType, StateRelationshipType } from '..';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementType } from '../../uml-element-type';
import { assign } from '../../../utils/fx/assign';

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
  code: {
    content: string;
    language: string;
    version?: string;
  } = {
    content: '',
    language: 'python',
    version: '1.0'
  };

  constructor(values?: DeepPartial<IUMLStateCodeBlockElement>) {
    super(values && !values.bounds ? { ...values, bounds: { x: 0, y: 0, width: 200, height: 100 } } : values);
    

    //console.log('Raw constructor values:', JSON.stringify(values, null, 2));

    // If values exist, override defaults
    if (values) {
      // First, try to get content from code.content
      if (values.code?.content) {
        this.text = values.code.content;
        this.code.content = values.code.content;
      } 
      // If no code.content, try text
      else if (values.text) {
        this.text = values.text;
        this.code.content = values.text;
      }

      // Set language
      if (values.code?.language) {
        this.language = values.code.language;
        this.code.language = values.code.language;
      } else if (values.language) {
        this.language = values.language;
        this.code.language = values.language;
      }

      // Set version
      this.code.version = values.code?.version || '1.0';
    };
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.text,
      language: this.language,
      code: {
        content: this.text,
        language: this.language,
        version: this.code.version
      }
    };
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }

  deserialize(values: any) {
    super.deserialize(values);
    
    // Handle code content and language
    const content = values.code?.content || values.text || '';
    const language = values.code?.language || values.language || 'python';
    const version = values.code?.version || '1.0';

    // Set values ensuring synchronization
    this.text = content;
    this.language = language;
    this.code = {
      content: content,
      language: language,
      version: version
    };
  }
}
