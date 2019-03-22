enum types {
  ClassDiagram = 'ClassDiagram',
  ObjectDiagram = 'ObjectDiagram',
  ActivityDiagram = 'ActivityDiagram',
  UseCaseDiagram = 'UseCaseDiagram',
}

export type DiagramType = types;

export const DiagramType = {
  ...types,
};
