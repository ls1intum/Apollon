import { ILayer } from '../../services/layouter/layer';
import { IBoundary } from '../../utils/geometry/boundary';
import { ComposePreview, PreviewElement } from '../compose-preview';
import { ControlFlowDecision } from './control-flow-decision/control-flow-decision';
import { ControlFlowFunctionCall } from './control-flow-function-call/control-flow-function-call';
import { ControlFlowInputOutput } from './control-flow-input-output/control-flow-input-output';
import { ControlFlowProcess } from './control-flow-process/control-flow-process';
import { ControlFlowTerminal } from './control-flow-terminal/control-flow-terminal';

export const composeControlFlowPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): PreviewElement[] => {
  const elements: PreviewElement[] = [];
  const defaultBounds: IBoundary = { x: 0, y: 0, width: 150, height: 75 };

  elements.push(
    new ControlFlowTerminal({
      name: translate('packages.ControlFlowDiagram.ControlFlowTerminal'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new ControlFlowProcess({
      name: translate('packages.ControlFlowDiagram.ControlFlowProcess'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new ControlFlowDecision({
      name: translate('packages.ControlFlowDiagram.ControlFlowDecision'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new ControlFlowInputOutput({
      name: translate('packages.ControlFlowDiagram.ControlFlowInputOutput'),
      bounds: defaultBounds,
    }),
  );

  elements.push(
    new ControlFlowFunctionCall({
      name: translate('packages.ControlFlowDiagram.ControlFlowFunctionCall'),
      bounds: defaultBounds,
    }),
  );

  return elements;
};
