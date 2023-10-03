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
): UMLElement[] => {
  const elements: UMLElement[] = [];
  UMLActivityForkNode.defaultWidth = Math.round(20 / 10) * 10;
  UMLActivityForkNode.defaultHeight = Math.round(60 / 10) * 10;
  UMLActivityForkNodeHorizontal.defaultWidth = Math.round(60 / 10) * 10;
  UMLActivityForkNodeHorizontal.defaultHeight = Math.round(20 / 10) * 10;
  // Activity
  const activity = new UMLActivity({ name: translate('packages.ActivityDiagram.Activity') });
  activity.bounds = {
    ...activity.bounds,
    width: activity.bounds.width,
    height: activity.bounds.height,
  };
  elements.push(activity);

  // Activity Initial Node
  const activityInitialNode = new UMLActivityInitialNode({
    bounds: { x: 0, y: 0, width: 45, height: 45 },
  });

  elements.push(activityInitialNode);

  // Activity Final Node
  const activityFinalNode = new UMLActivityFinalNode({
    bounds: { x: 0, y: 0, width: 45, height: 45 },
  });
  elements.push(activityFinalNode);

  // Activity Action Node
  const activityActionNode = new UMLActivityActionNode({
    name: translate('packages.ActivityDiagram.ActivityActionNode'),
  });
  activityActionNode.bounds = {
    ...activityActionNode.bounds,
    width: activityActionNode.bounds.width,
    height: activityActionNode.bounds.height,
  };
  elements.push(activityActionNode);

  // Activity Object Node
  const activityObjectNode = new UMLActivityObjectNode({
    name: translate('packages.ActivityDiagram.ActivityObjectNode'),
  });
  activityObjectNode.bounds = {
    ...activityObjectNode.bounds,
    width: activityObjectNode.bounds.width,
    height: activityObjectNode.bounds.height,
  };
  elements.push(activityObjectNode);

  // Activity Merge Node
  const activityMergeNode = new UMLActivityMergeNode({ name: translate('packages.ActivityDiagram.ActivityMergeNode') });
  activityMergeNode.bounds = {
    ...activityMergeNode.bounds,
    width: activityMergeNode.bounds.width,
    height: activityMergeNode.bounds.height,
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
