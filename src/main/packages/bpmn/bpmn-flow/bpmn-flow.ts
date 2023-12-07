import { BPMNRelationshipType } from '..';
import { UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { DeepPartial } from 'redux';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';
import { UMLElement } from '../../../services/uml-element/uml-element';
import * as Apollon from '../../../typings';

export type BPMNFlowType = 'sequence' | 'message' | 'association' | 'data association';

export class BPMNFlow extends UMLRelationshipCenteredDescription {
  static features = { ...UMLRelationship.features };
  static defaultFlowType: BPMNFlowType = 'sequence';

  type = BPMNRelationshipType.BPMNFlow;
  name = '';

  flowType: BPMNFlowType;

  constructor(values?: DeepPartial<Apollon.BPMNFlow>) {
    super(values);
    this.name = values?.name || this.name;
    this.flowType = values?.flowType || BPMNFlow.defaultFlowType;
  }

  serialize(children?: UMLElement[]): Apollon.BPMNFlow {
    return {
      ...super.serialize(),
      type: this.type as keyof typeof BPMNRelationshipType,
      flowType: this.flowType,
    };
  }

  deserialize<T extends Apollon.UMLModelElement>(
    values: T & { flowType?: BPMNFlowType },
    children?: Apollon.UMLModelElement[],
  ): void {
    super.deserialize(values, children);
    this.flowType = values.flowType || BPMNFlow.defaultFlowType;
  }
}
