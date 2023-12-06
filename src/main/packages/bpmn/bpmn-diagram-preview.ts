import { ILayer } from '../../services/layouter/layer';
import { IBoundary } from '../../utils/geometry/boundary';
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
import { BPMNPool } from './bpmn-pool/bpmn-pool';
import { BPMNDataObject } from './bpmn-data-object/bpmn-data-object';
import { BPMNGroup } from './bpmn-group/bpmn-group';
import { BPMNDataStore } from './bpmn-data-store/bpmn-data-store';

export const composeBPMNPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 160, height: 60 };

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
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNIntermediateEvent({
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNEndEvent({
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNGateway({
      bounds: { x: 0, y: 0, width: 40, height: 40 },
    }),
  );

  elements.push(
    new BPMNDataObject({
      bounds: { x: 0, y: 0, width: 40, height: 60 },
    }),
  );

  elements.push(
    new BPMNDataStore({
      bounds: { x: 0, y: 0, width: 60, height: 60 },
    }),
  );

  elements.push(
    new BPMNPool({
      name: translate('packages.BPMN.BPMNPool'),
      bounds: { x: 0, y: 0, width: 160, height: 80 },
    }),
  );

  return elements;
};
