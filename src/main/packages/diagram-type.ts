export type UMLDiagramType = keyof typeof UMLDiagramType;

export const UMLDiagramType = {
  ClassDiagram: 'ClassDiagram',
  ObjectDiagram: 'ObjectDiagram',
  ActivityDiagram: 'ActivityDiagram',
  UseCaseDiagram: 'UseCaseDiagram',
  CommunicationDiagram: 'CommunicationDiagram',
  ComponentDiagram: 'ComponentDiagram',
  DeploymentDiagram: 'DeploymentDiagram',
  PetriNet: 'PetriNet',
  SyntaxTree: 'SyntaxTree',
  ControlFlowDiagram: 'ControlFlowDiagram',
} as const;
