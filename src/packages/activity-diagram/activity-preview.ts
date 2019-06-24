import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { ActivityActionNode } from './activity-action-node/activity-action-node';
import { ActivityFinalNode } from './activity-final-node/activity-final-node';
import { ActivityForkNode } from './activity-fork-node/activity-fork-node';
import { ActivityInitialNode } from './activity-initial-node/activity-initial-node';
import { ActivityMergeNode } from './activity-merge-node/activity-merge-node';
import { ActivityObjectNode } from './activity-object-node/activity-object-node';

export const composeActivityPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // Activity Initial Node
  elements.push(new ActivityInitialNode());

  // Activity Final Node
  elements.push(new ActivityFinalNode());

  // Activity Action Node
  const activityActionNode = new ActivityActionNode({ name: translate('packages.activityDiagram.actionNode') });
  elements.push(activityActionNode);

  // Activity Object Node
  const activityObjectNode = new ActivityObjectNode({ name: translate('packages.activityDiagram.objectNode') });
  elements.push(activityObjectNode);

  // Activity Merge Node
  const activityMergeNode = new ActivityMergeNode({ name: translate('packages.activityDiagram.condition') });
  elements.push(activityMergeNode);

  // Activity Fork Node
  const activityForkNode = new ActivityForkNode();
  elements.push(activityForkNode);

  return elements;
};
