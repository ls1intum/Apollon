import { ILayer } from '../../services/layouter/layer';
import { UMLElement } from '../../services/uml-element/uml-element';
import { computeDimension } from '../../utils/geometry/boundary';
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
  const umlUseCase = new UMLUseCase({ name: translate('packages.UseCaseDiagram.UseCase') });
  umlUseCase.bounds = {
    ...umlUseCase.bounds,
    width: umlUseCase.bounds.width,
    height: umlUseCase.bounds.height,
  };

  elements.push(umlUseCase);

  // UML Actor
  const umlActor = new UMLUseCaseActor({
    name: translate('packages.UseCaseDiagram.UseCaseActor'),
    bounds: {
      x: 0,
      y: 0,
      width: computeDimension(1.0, 80),
      height: computeDimension(1.0, 140),
    },
  });
  elements.push(umlActor);

  // UML System
  const umlSystem = new UMLUseCaseSystem({ name: translate('packages.UseCaseDiagram.UseCaseSystem') });
  umlSystem.bounds = {
    ...umlSystem.bounds,
    width: umlSystem.bounds.width,
    height: umlSystem.bounds.height,
  };
  elements.push(umlSystem);

  return elements;
};
