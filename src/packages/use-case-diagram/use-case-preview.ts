import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UseCaseActor } from './use-case-actor/use-case-actor';
import { UseCaseSystem } from './use-case-system/use-case-system';
import { UseCase } from './use-case/use-case';

export const composeUseCasePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
): UMLElement[] => {
  const elements: UMLElement[] = [];

  // UML Use Case
  const umlUseCase = new UseCase({ name: translate('packages.useCaseDiagram.useCase') });
  elements.push(umlUseCase);

  // UML Actor
  const umlActor = new UseCaseActor({ name: translate('packages.useCaseDiagram.actor') });
  elements.push(umlActor);

  // UML System
  const umlSystem = new UseCaseSystem({ name: translate('packages.useCaseDiagram.system') });
  elements.push(umlSystem);

  return elements;
};
