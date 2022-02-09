import { ILayer } from '../../services/layouter/layer.js';
import { UMLElement } from '../../services/uml-element/uml-element.js';
import { ComposePreview } from '../compose-preview.js';
import { UMLActivityActionNode } from './uml-activity-action-node/uml-activity-action-node.js';
import { UMLActivityFinalNode } from './uml-activity-final-node/uml-activity-final-node.js';
import { UMLActivityForkNode } from './uml-activity-fork-node/uml-activity-fork-node.js';
import { UMLActivityInitialNode } from './uml-activity-initial-node/uml-activity-initial-node.js';
import { UMLActivityMergeNode } from './uml-activity-merge-node/uml-activity-merge-node.js';
import { UMLActivityObjectNode } from './uml-activity-object-node/uml-activity-object-node.js';
import { UMLActivity } from './uml-activity/uml-activity.js';

export const composeActivityPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];
  UMLActivityForkNode.defaultWidth = 20 * scale;
  UMLActivityForkNode.defaultHeight = 60 * scale;
  // Activity
  const activity = new UMLActivity({ name: translate('packages.ActivityDiagram.Activity') });
  activity.bounds = {
    ...activity.bounds,
    width: activity.bounds.width * scale,
    height: activity.bounds.height * scale,
  };
  elements.push(activity);

  // Activity Initial Node
  const activityInitialNode = new UMLActivityInitialNode({
    bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
  });

  elements.push(activityInitialNode);

  // Activity Final Node
  const activityFinalNode = new UMLActivityFinalNode({
    bounds: { x: 0, y: 0, width: 45 * scale, height: 45 * scale },
  });
  elements.push(activityFinalNode);

  // Activity Action Node
  const activityActionNode = new UMLActivityActionNode({
    name: translate('packages.ActivityDiagram.ActivityActionNode'),
  });
  activityActionNode.bounds = {
    ...activityActionNode.bounds,
    width: activityActionNode.bounds.width * scale,
    height: activityActionNode.bounds.height * scale,
  };
  elements.push(activityActionNode);

  // Activity Object Node
  const activityObjectNode = new UMLActivityObjectNode({
    name: translate('packages.ActivityDiagram.ActivityObjectNode'),
  });
  activityObjectNode.bounds = {
    ...activityObjectNode.bounds,
    width: activityObjectNode.bounds.width * scale,
    height: activityObjectNode.bounds.height * scale,
  };
  elements.push(activityObjectNode);

  // Activity Merge Node
  const activityMergeNode = new UMLActivityMergeNode({ name: translate('packages.ActivityDiagram.ActivityMergeNode') });
  activityMergeNode.bounds = {
    ...activityMergeNode.bounds,
    width: activityMergeNode.bounds.width * scale,
    height: activityMergeNode.bounds.height * scale,
  };
  elements.push(activityMergeNode);

  // Activity Fork Node
  const activityForkNode = new UMLActivityForkNode();
  elements.push(activityForkNode);

  return elements;
};
