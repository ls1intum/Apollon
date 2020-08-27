import { DeepPartial } from 'redux';
import { CommunicationRelationshipType } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import * as Apollon from '../../../typings';
import { assign } from '../../../utils/fx/assign';

export type CommunicationMessage = {
  id: string;
  name: string;
  direction: 'source' | 'target';
};

export interface IUMLCommunicationLink extends IUMLRelationship {
  messages: CommunicationMessage[];
}

export class UMLCommunicationLink extends UMLRelationship implements IUMLCommunicationLink {
  type = CommunicationRelationshipType.CommunicationLink;
  messages: CommunicationMessage[] = [];

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
    this.messages = values.messages;
  }
}
