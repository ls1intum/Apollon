import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLStateActionNode } from './uml-state-action-node/uml-state-action-node';
import { UMLStateFinalNode } from './uml-state-final-node/uml-state-final-node';
import { UMLStateForkNodeHorizontal } from './uml-state-fork-node-horizontal/uml-state-fork-node-horizontal';
import { UMLStateForkNode } from './uml-state-fork-node/uml-state-fork-node';
import { UMLStateInitialNode } from './uml-state-initial-node/uml-state-initial-node';
import { UMLStateMergeNode } from './uml-state-merge-node/uml-state-merge-node';
import { UMLStateObjectNode } from './uml-state-object-node/uml-state-object-node';
import { UMLState } from './uml-state/uml-state';
import { UMLStateCodeBlock } from './uml-state-code-block/uml-state-code-block';
import { UMLStateBody } from './uml-state-body/uml-state-body';
import { UMLStateFallbackBody } from './uml-state-fallback_body/uml-state-fallback_body';

const computeDimension = (scale: number, value: number): number => {
  return Math.round((scale * value) / 10) * 10;
};

export const composeStatePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];
  UMLStateForkNode.defaultWidth = Math.round(20 / 10) * 10;
  UMLStateForkNode.defaultHeight = Math.round(60 / 10) * 10;
  UMLStateForkNodeHorizontal.defaultWidth = Math.round(60 / 10) * 10;
  UMLStateForkNodeHorizontal.defaultHeight = Math.round(20 / 10) * 10;
  
  // Empty State
  const emptyState = new UMLState({ name: translate('packages.StateDiagram.State') });
  emptyState.bounds = {
    ...emptyState.bounds,
    width: emptyState.bounds.width,
    height: emptyState.bounds.height,
  };
  elements.push(emptyState);

  // State with Body
  const stateWithBody = new UMLState({ name: translate('packages.StateDiagram.State') });
  stateWithBody.bounds = {
    ...stateWithBody.bounds,
    width: stateWithBody.bounds.width,
    height: stateWithBody.bounds.height,
  };
  const stateBody = new UMLStateBody({
    name: translate('popup.bodies'),
    owner: stateWithBody.id,
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  stateWithBody.ownedElements = [stateBody.id];
  elements.push(...(stateWithBody.render(layer, [stateBody]) as UMLElement[]));

  // State with Body and Fallback Body
  const stateWithBothBodies = new UMLState({ name: translate('packages.StateDiagram.State') });
  stateWithBothBodies.bounds = {
    ...stateWithBothBodies.bounds,
    width: stateWithBothBodies.bounds.width,
    height: stateWithBothBodies.bounds.height,
  };
  const stateBody2 = new UMLStateBody({
    name: translate('popup.bodies'),
    owner: stateWithBothBodies.id,
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  const fallbackBody = new UMLStateFallbackBody({
    name: translate('popup.fallback_bodies'),
    owner: stateWithBothBodies.id,
    bounds: {
      x: 0,
      y: 40,
      width: computeDimension(1.0, 200),
      height: computeDimension(1.0, 30),
    },
  });
  stateWithBothBodies.ownedElements = [stateBody2.id, fallbackBody.id];
  elements.push(...(stateWithBothBodies.render(layer, [stateBody2, fallbackBody]) as UMLElement[]));

  // State Initial Node
  const stateInitialNode = new UMLStateInitialNode({
    bounds: { x: 0, y: 0, width: 45, height: 45 },
  });
  elements.push(stateInitialNode);

  // State Final Node
  const stateFinalNode = new UMLStateFinalNode({
    bounds: { x: 0, y: 0, width: 45, height: 45 },
  });
  elements.push(stateFinalNode);

  // // State Action Node
  // const stateActionNode = new UMLStateActionNode({
  //   name: translate('packages.StateDiagram.StateActionNode'),
  // });
  // stateActionNode.bounds = {
  //   ...stateActionNode.bounds,
  //   width: stateActionNode.bounds.width,
  //   height: stateActionNode.bounds.height,
  // };
  // elements.push(stateActionNode);

  // // State Object Node
  // const stateObjectNode = new UMLStateObjectNode({
  //   name: translate('packages.StateDiagram.StateObjectNode'),
  // });
  // stateObjectNode.bounds = {
  //   ...stateObjectNode.bounds,
  //   width: stateObjectNode.bounds.width,
  //   height: stateObjectNode.bounds.height,
  // };
  // elements.push(stateObjectNode);

  // // State Merge Node
  // const stateMergeNode = new UMLStateMergeNode({ name: translate('packages.StateDiagram.StateMergeNode') });
  // stateMergeNode.bounds = {
  //   ...stateMergeNode.bounds,
  //   width: stateMergeNode.bounds.width,
  //   height: stateMergeNode.bounds.height,
  // };
  // elements.push(stateMergeNode);

  // // State Fork Node
  // const stateForkNode = new UMLStateForkNode();
  // elements.push(stateForkNode);

  // // State Fork Node Horizontal
  // const stateForkNodeHorizontal = new UMLStateForkNodeHorizontal();
  // elements.push(stateForkNodeHorizontal);

  // State Code Block
  const stateCodeBlock = new UMLStateCodeBlock({
    text: '# Sample code\nprint("Hello World")',
    language: 'python',
    bounds: { x: 0, y: 0, width: 150, height: 150 },
    code: {
      content: '# Sample code\nprint("Hello World")',
      language: 'python',
      version: '1.0'
    }
  });
  elements.push(stateCodeBlock);

  return elements;
};
