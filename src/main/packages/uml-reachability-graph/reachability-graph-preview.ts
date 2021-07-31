import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph-marking/uml-reachability-graph-marking';

export const composeReachabilityGraphPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  const umlReachabilityGraphMarking = new UMLReachabilityGraphMarking({
    name: translate('packages.ReachabilityGraph.ReachabilityGraphMarking'),
    bounds: { x: 0, y: 0, width: 200 * scale, height: 100 * scale },
  });

  elements.push(umlReachabilityGraphMarking);

  return elements;
};
