import { ILayer } from '../../services/layouter/layer';
import { computeDimension, IBoundary } from '../../utils/geometry/boundary';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { FlowchartDecision } from './flowchart-decision/flowchart-decision';
import { FlowchartFunctionCall } from './flowchart-function-call/flowchart-function-call';
import { FlowchartInputOutput } from './flowchart-input-output/flowchart-input-output';
import { FlowchartProcess } from './flowchart-process/flowchart-process';
import { FlowchartTerminal } from './flowchart-terminal/flowchart-terminal';

export const composeFlowchartPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 160, height: computeDimension(1.0, 70) };

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
      bounds: {
        ...defaultBounds,
        width: 140,
      },
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
