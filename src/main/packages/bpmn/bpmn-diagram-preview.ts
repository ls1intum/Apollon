import { ILayer } from '../../services/layouter/layer';
import { computeDimension, IBoundary } from '../../utils/geometry/boundary';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { BPMNTask } from './bpmn-task/bpmn-task';
import { BPMNSubprocess } from './bpmn-subprocess/bpmn-subprocess';
import { BPMNStartEvent } from './bpmn-start-event/bmpn-start-event';
import { BPMNIntermediateEvent } from './bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNEndEvent } from './bpmn-end-event/bpmn-end-event';
import { BPMNExclusiveGateway } from './bpmn-exclusive-gateway/bpmn-exclusive-gateway';
import { BPMNInclusiveGateway } from './bpmn-inclusive-gateway/bpmn-inclusive-gateway';
import { BPMNParallelGateway } from './bpmn-parallel-gateway/bpmn-parallel-gateway';
import { BPMNEventBasedGateway } from './bpmn-event-based-gateway/bpmn-event-based-gateway';

export const composeBPMNPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 150 * scale, height: computeDimension(scale, 70) };

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
    new BPMNStartEvent({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  elements.push(
    new BPMNIntermediateEvent({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  elements.push(
    new BPMNEndEvent({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  elements.push(
    new BPMNExclusiveGateway({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  elements.push(
    new BPMNInclusiveGateway({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  elements.push(
    new BPMNParallelGateway({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  elements.push(
    new BPMNEventBasedGateway({
      bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
    }),
  );

  return elements;
};
