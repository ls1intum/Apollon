import React, { FunctionComponent } from 'react';
import { BPMNGateway } from './bpmn-gateway';
import { BPMNEventBasedGatewayComponent } from './gateways-components/bpmn-event-based-gateway-component';
import { BPMNExclusiveGatewayComponent } from './gateways-components/bpmn-exclusive-gateway-component';
import { BPMNInclusiveGatewayComponent } from './gateways-components/bpmn-inclusive-gateway-component';
import { BPMNParallelGatewayComponent } from './gateways-components/bpmn-parallel-gateway-component';
import { BPMNComplexGatewayComponent } from './gateways-components/bpmn-complex-gateway-component';

export const BPMNGatewayComponent: FunctionComponent<Props> = (props) => {
  let GatewayComponent = BPMNExclusiveGatewayComponent;

  switch (props.element.gatewayType) {
    case 'complex':
      GatewayComponent = BPMNComplexGatewayComponent;
      break;
    case 'event-based':
      GatewayComponent = BPMNEventBasedGatewayComponent;
      break;
    case 'exclusive':
      GatewayComponent = BPMNExclusiveGatewayComponent;
      break;
    case 'inclusive':
      GatewayComponent = BPMNInclusiveGatewayComponent;
      break;
    case 'parallel':
      GatewayComponent = BPMNParallelGatewayComponent;
      break;
  }

  return (
    <g>
      <GatewayComponent {...props} />
    </g>
  );
};

export interface Props {
  element: BPMNGateway;
  fillColor?: string;
}
