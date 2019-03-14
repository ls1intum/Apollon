export const DiagramType = 'UseCaseDiagram';

export enum ElementKind {
  UseCase = 'UseCase',
  UseCaseActor = 'UseCaseActor',
  UseCaseSystem = 'UseCaseSystem',
}

export enum RelationshipKind {
  UseCaseAssociation = 'UseCaseAssociation',
  UseCaseGeneralization = 'UseCaseGeneralization',
  UseCaseInclude = 'UseCaseInclude',
}
