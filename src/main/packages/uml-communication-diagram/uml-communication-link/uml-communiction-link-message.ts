import { DeepPartial } from 'redux';
import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element.js';
import { ILayer } from '../../../services/layouter/layer.js';
import { ILayoutable } from '../../../services/layouter/layoutable.js';
import { CommunicationElementType } from '../index.js';

export interface ICommunicationLinkMessage extends IUMLElement {
  direction: 'source' | 'target';
}

export class CommunicationLinkMessage extends UMLElement implements ICommunicationLinkMessage {
  direction: 'source' | 'target';
  type = CommunicationElementType.CommunicationLinkMessage;

  constructor(values?: DeepPartial<ICommunicationLinkMessage>) {
    super(values);
    this.direction = values?.direction || 'target';
  }

  /**
   * Needs to be implemented, because it is a abstract method of {@link UMLElement}
   * Does not do anything -> CommunicationLinkMessage is aligned in parent {@link UMLCommunicationLink}
   * @param canvas
   */
  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
