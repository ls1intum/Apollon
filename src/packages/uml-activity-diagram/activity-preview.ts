import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLActivityActionNode } from './uml-activity-action-node/uml-activity-action-node';
import { UMLActivityFinalNode } from './uml-activity-final-node/uml-activity-final-node';
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

  // Activity
  elements.push(new UMLActivity({ name: translate('packages.activityDiagram.activity') }));

  // Activity Initial Node
  elements.push(new UMLActivityInitialNode());

  // Activity Final Node
  elements.push(new UMLActivityFinalNode());

  // Activity Action Node
  const activityActionNode = new UMLActivityActionNode({ name: translate('packages.activityDiagram.actionNode') });
  elements.push(activityActionNode);

  // Activity Object Node
  const activityObjectNode = new UMLActivityObjectNode({ name: translate('packages.activityDiagram.objectNode') });
  elements.push(activityObjectNode);

  // Activity Merge Node
  const activityMergeNode = new UMLActivityMergeNode({ name: translate('packages.activityDiagram.condition') });
  elements.push(activityMergeNode);

  // Activity Fork Node
  const activityForkNode = new UMLActivityForkNode();
  elements.push(activityForkNode);

  return elements;
};
