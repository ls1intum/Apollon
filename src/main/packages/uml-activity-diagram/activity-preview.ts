import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLActivityActionNode } from './uml-activity-action-node/uml-activity-action-node';
import { UMLActivityFinalNode } from './uml-activity-final-node/uml-activity-final-node';
import { UMLActivityForkNodeHorizontal } from './uml-activity-fork-node-horizontal/uml-activity-fork-node-horizontal';
import { UMLActivityForkNode } from './uml-activity-fork-node/uml-activity-fork-node';
import { UMLActivityInitialNode } from './uml-activity-initial-node/uml-activity-initial-node';
import { UMLActivityMergeNode } from './uml-activity-merge-node/uml-activity-merge-node';
import { UMLActivityObjectNode } from './uml-activity-object-node/uml-activity-object-node';
import { UMLActivity } from './uml-activity/uml-activity';

export const composeActivityPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];
  UMLActivityForkNode.defaultWidth = Math.round((20 * scale) / 10) * 10;
  UMLActivityForkNode.defaultHeight = Math.round((60 * scale) / 10) * 10;
  UMLActivityForkNodeHorizontal.defaultWidth = Math.round((60 * scale) / 10) * 10;
  UMLActivityForkNodeHorizontal.defaultHeight = Math.round((20 * scale) / 10) * 10;
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

  // Activity Fork Node Horizontal
  const activityForkNodeHorizontal = new UMLActivityForkNodeHorizontal();
  elements.push(activityForkNodeHorizontal);

  return elements;
};
