import { ILayer } from '../../services/layouter/layer.js';
import { IBoundary } from '../../utils/geometry/boundary.js';
import { ComposePreview, PreviewElement } from '../compose-preview.js';
import { FlowchartDecision } from './flowchart-decision/flowchart-decision.js';
import { FlowchartFunctionCall } from './flowchart-function-call/flowchart-function-call.js';
import { FlowchartInputOutput } from './flowchart-input-output/flowchart-input-output.js';
import { FlowchartProcess } from './flowchart-process/flowchart-process.js';
import { FlowchartTerminal } from './flowchart-terminal/flowchart-terminal.js';

export const composeFlowchartPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 150 * scale, height: 75 * scale };

  elements.push(
    new FlowchartTerminal({
      name: translate('packages.Flowchart.FlowchartTerminal'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new FlowchartProcess({
      name: translate('packages.Flowchart.FlowchartProcess'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new FlowchartDecision({
      name: translate('packages.Flowchart.FlowchartDecision'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new FlowchartInputOutput({
      name: translate('packages.Flowchart.FlowchartInputOutput'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new FlowchartFunctionCall({
      name: translate('packages.Flowchart.FlowchartFunctionCall'),
      bounds: defaultBounds,
    }),
  );

  return elements;
};
