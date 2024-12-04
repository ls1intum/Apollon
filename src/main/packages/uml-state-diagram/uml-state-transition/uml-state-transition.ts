import { StateRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';
import * as Apollon from '../../../typings';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { DeepPartial } from 'redux';

export interface IUMLStateTransition {
  params?: string;
}

export class UMLStateTransition extends UMLRelationshipCenteredDescription implements IUMLStateTransition {
  type = StateRelationshipType.StateTransition;
  params: string = '';

  constructor(values?: DeepPartial<Apollon.UMLStateTransition>) {
    super(values);
    this.params = values?.params || '';
  }

  serialize(): Apollon.UMLStateTransition {
    return {
      ...super.serialize(),
      type: this.type,
      params: this.params || undefined
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { params?: string },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.params = values.params || '';
  }
} 