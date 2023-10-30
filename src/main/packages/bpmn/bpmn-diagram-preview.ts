import { ILayer } from '../../services/layouter/layer';
import { computeDimension, IBoundary } from '../../utils/geometry/boundary';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { BPMNTask } from './bpmn-task/bpmn-task';
import { BPMNSubprocess } from './bpmn-subprocess/bpmn-subprocess';
import { BPMNStartEvent } from './bpmn-start-event/bpmn-start-event';
import { BPMNIntermediateEvent } from './bpmn-intermediate-event/bpmn-intermediate-event';
import { BPMNEndEvent } from './bpmn-end-event/bpmn-end-event';
import { BPMNGateway } from './bpmn-gateway/bpmn-gateway';
import { BPMNTransaction } from './bpmn-transaction/bpmn-transaction';
import { BPMNCallActivity } from './bpmn-call-activity/bpmn-call-activity';
import { BPMNAnnotation } from './bpmn-annotation/bpmn-annotation';
import { BPMNConversation } from './bpmn-conversation/bpmn-conversation';
import { BPMNDataObject } from './bpmn-data-object/bpmn-data-object';
import { BPMNGroup } from './bpmn-group/bpmn-group';

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
    new BPMNGroup({
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new BPMNAnnotation({
      name: translate('packages.BPMN.BPMNAnnotation'),
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
    new BPMNGateway({
      name: translate('packages.BPMN.BPMNGateway'),
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNDataObject({
      bounds: { x: 0, y: 0, width: 50, height: 60 },
    }),
  );

  return elements;
};
