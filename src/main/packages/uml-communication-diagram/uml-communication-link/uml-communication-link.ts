import { DeepPartial } from 'redux';
import { CommunicationRelationshipType } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';
import { CommunicationLinkMessage, ICommunicationLinkMessage } from './uml-communiction-link-message';

export interface IUMLCommunicationLink extends IUMLRelationship {
  messages: ICommunicationLinkMessage[];
}

export class UMLCommunicationLink extends UMLRelationship implements IUMLCommunicationLink {
  type = CommunicationRelationshipType.CommunicationLink;
  messages: ICommunicationLinkMessage[] = [];

  constructor(values?: DeepPartial<IUMLCommunicationLink>) {
    super();
    assign<IUMLCommunicationLink>(this, values);
  }

  serialize(): Apollon.UMLCommunicationLink {
    return {
      ...super.serialize(),
      messages: this.messages,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(values: T, children?: Apollon.UMLModelElement[]) {
    const assert = (v: Apollon.UMLModelElement): v is Apollon.UMLCommunicationLink =>
      v.type === CommunicationRelationshipType.CommunicationLink;
    if (!assert(values)) {
      return;
    }

    super.deserialize(values, children);
    this.messages = values.messages.map((message) => new CommunicationLinkMessage(message));
  }

  //  TODO: add render method which layouts the messages
}
