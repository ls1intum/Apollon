import { BPMNElementType, BPMNRelationshipType } from '..';
import { IUMLRelationship, UMLRelationship } from '../../../services/uml-relationship/uml-relationship';
import { ReachabilityGraphRelationshipType } from '../../uml-reachability-graph';
import { DeepPartial } from 'redux';
import { UMLRelationshipCenteredDescription } from '../../../services/uml-relationship/uml-relationship-centered-description';
import { UMLElement } from '../../../services/uml-element/uml-element';
import * as Apollon from '../../../typings';
import { BPMNGatewayType } from '../bpmn-gateway/bpmn-gateway';
import { BPMNFlow } from '../../../typings';

export type BPMNFlowType = 'sequence' | 'message' | 'association';

export class BPMNSequenceFlow extends UMLRelationshipCenteredDescription {
  static features = { ...UMLRelationship.features };
  static defaultFlowType: BPMNFlowType = 'sequence';

  type = BPMNRelationshipType.BPMNSequenceFlow;
  name = '';

  flowType: BPMNFlowType;

  constructor(values?: DeepPartial<BPMNFlow>) {
    super(values);
    this.name = values?.name || this.name;
    this.flowType = values?.flowType || BPMNSequenceFlow.defaultFlowType;
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
  ) {
    super.deserialize(values, children);
    this.flowType = values.flowType || BPMNSequenceFlow.defaultFlowType;
  }
}
