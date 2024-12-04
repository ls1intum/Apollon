import { StateRelationshipType } from '..';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';
import * as Apollon from '../../../typings';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { DeepPartial } from 'redux';

export interface IUMLStateTransition {
  params: { [id: string]: string };
}

export class UMLStateTransition extends UMLRelationshipCenteredDescription implements IUMLStateTransition {
  type = StateRelationshipType.StateTransition;
  params: { [id: string]: string } = {};

  constructor(values?: DeepPartial<Apollon.UMLStateTransition>) {
    super(values);
    this.params = {};
    if (values?.params) {
      if (typeof values.params === 'string') {
        this.params = { '0': values.params };
      } else if (Array.isArray(values.params)) {
        values.params.forEach((param, index) => {
          this.params[index.toString()] = param;
        });
      } else {
        this.params = values.params;
      }
    }
  }

  serialize(): Apollon.UMLStateTransition {
    const base = super.serialize();
    const paramValues = Object.values(this.params);
    return {
      ...base,
      type: this.type,
      params: paramValues.length === 0 ? undefined :
             paramValues.length === 1 ? paramValues[0] :
             paramValues
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { params?: string | string[] | { [id: string]: string } },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.params = {};
    if (values.params) {
      if (typeof values.params === 'string') {
        this.params = { '0': values.params };
      } else if (Array.isArray(values.params)) {
        values.params.forEach((param, index) => {
          this.params[index.toString()] = param;
        });
      } else {
        this.params = values.params;
      }
    }
  }
} 