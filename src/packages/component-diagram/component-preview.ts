import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { ComponentInterface } from './component-interface/component-interface';
import { Component } from './component/component';

export const composeComponentPreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Component
  const umlComponent = new Component({ name: translate('packages.componentDiagram.component') });
  elements.push(umlComponent);

  // UML Deployment Artifact
  const umlComponentInterface = new ComponentInterface({ name: translate('packages.componentDiagram.interface') });
  elements.push(umlComponentInterface);

  return elements;
};
