import { DeploymentElementType, UMLDeploymentNode } from '..';
import { Container, IContainer } from '../../../services/container/container';
import { Element, IElement } from '../../../services/element/element';
import { UMLElement } from '../../../typings';
import { computeBoundingBoxForElements } from '../../../utils/geometry/boundary';

export interface IDeploymentNode extends IContainer {
  stereotype: string;
}

export class DeploymentNode extends Container {
  type = DeploymentElementType.DeploymentNode;

  stereotype = 'node';

  constructor(values?: IDeploymentNode);
  constructor(values?: UMLDeploymentNode);
  constructor(values?: IElement | UMLElement);
  constructor(values?: IDeploymentNode | UMLDeploymentNode) {
    super(values);
    this.stereotype = (values && values.stereotype) || 'node';
  }

  toUMLElement(element: DeploymentNode, children: Element[]): { element: UMLDeploymentNode; children: Element[] } {
    const { element: base } = super.toUMLElement(element, children);
    return {
      element: {
        ...base,
        stereotype: element.stereotype,
      },
      children,
    };
  }

  render(elements: Element[]): Element[] {
    const [parent, ...children] = super.render(elements);
    const absoluteChildren: Element[] = children.map<Element>(child => {
      child.bounds.x += parent.bounds.x;
      child.bounds.y += parent.bounds.y;
      return child;
    });
    const bounds = computeBoundingBoxForElements([parent, ...absoluteChildren]);
    const relativeChildren: Element[] = absoluteChildren.map<Element>(child => {
      child.bounds.x -= parent.bounds.x;
      child.bounds.y -= parent.bounds.y;
      return child;
    });
    const deltaX = bounds.x - parent.bounds.x;
    const deltaY = bounds.y - parent.bounds.y;
    relativeChildren.forEach(child => {
      child.bounds.x -= deltaX;
      child.bounds.y -= deltaY;
    });
    const resizedParent = new DeploymentNode({ ...(parent as DeploymentNode), bounds });
    return [resizedParent, ...relativeChildren];
  }

  resize(children: Element[]): Element[] {
    const bounds = computeBoundingBoxForElements(children);
    this.bounds.width = Math.max(this.bounds.width, bounds.x + bounds.width, 100);
    this.bounds.height = Math.max(this.bounds.height, bounds.y + bounds.height, 100);
    return [this, ...children];
  }
}
