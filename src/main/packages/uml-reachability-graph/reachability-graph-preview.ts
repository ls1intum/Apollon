import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLReachabilityGraphMarking } from './uml-reachability-graph-marking/uml-reachability-graph-marking';

export const composeReachabilityGraphPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  const umlReachabilityGraphMarking = new UMLReachabilityGraphMarking({
    name: translate('packages.ReachabilityGraph.ReachabilityGraphMarking'),
  });

  elements.push(umlReachabilityGraphMarking);

  return elements;
};
