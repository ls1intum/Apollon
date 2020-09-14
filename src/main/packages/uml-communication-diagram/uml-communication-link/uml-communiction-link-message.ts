import { IUMLElement, UMLElement } from '../../../services/uml-element/uml-element';
import { ILayer } from '../../../services/layouter/layer';
import { ILayoutable } from '../../../services/layouter/layoutable';
import { DeepPartial } from 'redux';
import { CommunicationRelationshipType } from '../index';

export interface ICommunicationLinkMessage extends IUMLElement {
  direction: 'source' | 'target';
}

export class CommunicationLinkMessage extends UMLElement implements ICommunicationLinkMessage {
  direction: 'source' | 'target';
  type = CommunicationRelationshipType.CommunicationLink;

  constructor(values?: DeepPartial<CommunicationLinkMessage>) {
    super(values);
    this.direction = values?.direction || 'target';
  }

  render(canvas: ILayer): ILayoutable[] {
    return [this];
  }
}
