import { ILayer } from '../../services/layouter/layer';
import { computeDimension, IBoundary } from '../../utils/geometry/boundary';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { BPMNTask } from './bpmn-task/bpmn-task';
import { BPMNSubprocess } from './bpmn-subprocess/bpmn-subprocess';
import { BPMNStartEvent } from './bpmn-start-event/bpmn-start-event';
import { BPMNIntermediateEvent } from './bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNEndEvent } from './bpmn-end-event/bpmn-end-event';
import { BPMNExclusiveGateway } from './bpmn-exclusive-gateway/bpmn-exclusive-gateway';
import { BPMNInclusiveGateway } from './bpmn-inclusive-gateway/bpmn-inclusive-gateway';
import { BPMNParallelGateway } from './bpmn-parallel-gateway/bpmn-parallel-gateway';
import { BPMNEventBasedGateway } from './bpmn-event-based-gateway/bpmn-event-based-gateway';
import { BPMNTransaction } from './bpmn-transaction/bpmn-transaction';
import { BPMNCallActivity } from './bpmn-call-activity/bpmn-call-activity';

export const composeBPMNPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 150, height: computeDimension(1.0, 60) };

  elements.push(
    new BPMNTask({
      name: translate('packages.BPMN.BPMNTask'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new BPMNSubprocess({
      name: translate('packages.BPMN.BPMNSubprocess'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new BPMNTransaction({
      name: translate('packages.BPMN.BPMNTransaction'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new BPMNCallActivity({
      name: translate('packages.BPMN.BPMNCallActivity'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new BPMNStartEvent({
      name: translate('packages.BPMN.BPMNStartEvent'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNIntermediateEvent({
      name: translate('packages.BPMN.BPMNIntermediateEvent'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNEndEvent({
      name: translate('packages.BPMN.BPMNEndEvent'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNExclusiveGateway({
      name: translate('packages.BPMN.BPMNExclusiveGateway'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNInclusiveGateway({
      name: translate('packages.BPMN.BPMNInclusiveGateway'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNParallelGateway({
      name: translate('packages.BPMN.BPMNParallelGateway'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNEventBasedGateway({
      name: translate('packages.BPMN.BPMNEventBasedGateway'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  return elements;
};
