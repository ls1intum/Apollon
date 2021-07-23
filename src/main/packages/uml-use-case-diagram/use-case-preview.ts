import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { ComposePreview } from '../compose-preview';
import { UMLUseCaseActor } from './uml-use-case-actor/uml-use-case-actor';
import { UMLUseCaseSystem } from './uml-use-case-system/uml-use-case-system';
import { UMLUseCase } from './uml-use-case/uml-use-case';

export const composeUseCasePreview: ComposePreview = (
  layer: ILayer,
  translate: (id: string) => string,
  scale: number,
): UMLElement[] => {
  const elements: UMLElement[] = [];
  // UML Use Case
  const umlUseCase = new UMLUseCase({ name: translate('packages.UseCaseDiagram.UseCase') });
  umlUseCase.bounds = {
    ...umlUseCase.bounds,
    width: umlUseCase.bounds.width * scale,
    height: umlUseCase.bounds.height * scale,
  };

  elements.push(umlUseCase);

  // UML Actor
  const umlActor = new UMLUseCaseActor({
    name: translate('packages.UseCaseDiagram.UseCaseActor'),
    bounds: { x: 0, y: 0, width: 90 * scale, height: 140 * scale },
  });
  elements.push(umlActor);

  // UML System
  const umlSystem = new UMLUseCaseSystem({ name: translate('packages.UseCaseDiagram.UseCaseSystem') });
  umlSystem.bounds = {
    ...umlSystem.bounds,
    width: umlSystem.bounds.width * scale,
    height: umlSystem.bounds.height * scale,
  };
  elements.push(umlSystem);
  console.log(elements);

  return elements;
};
