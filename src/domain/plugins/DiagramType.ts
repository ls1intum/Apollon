export type DiagramType = typeof DiagramType[keyof typeof DiagramType];
export const DiagramType = Object.freeze({
  ClassDiagram: 'ClassDiagram' as 'ClassDiagram',
  ObjectDiagram: 'ObjectDiagram' as 'ObjectDiagram',
  ActivityDiagram: 'ActivityDiagram' as 'ActivityDiagram',
  UseCaseDiagram: 'UseCaseDiagram' as 'UseCaseDiagram',
});
