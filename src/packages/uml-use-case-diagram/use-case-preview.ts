import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLUseCaseActor } from './uml-use-case-actor/uml-use-case-actor';
import { UMLUseCaseSystem } from './uml-use-case-system/uml-use-case-system';
import { UMLUseCase } from './uml-use-case/uml-use-case';

export const composeUseCasePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Use Case
  const umlUseCase = new UMLUseCase({ name: translate('packages.useCaseDiagram.useCase') });
  elements.push(umlUseCase);

  // UML Actor
  const umlActor = new UMLUseCaseActor({ name: translate('packages.useCaseDiagram.actor') });
  elements.push(umlActor);

  // UML System
  const umlSystem = new UMLUseCaseSystem({ name: translate('packages.useCaseDiagram.system') });
  elements.push(umlSystem);

  return elements;
};
