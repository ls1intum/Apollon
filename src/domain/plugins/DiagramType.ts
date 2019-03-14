import { DiagramType as ClassDiagramType } from './ClassDiagram';
import { DiagramType as UseCaseDiagramType } from './UseCaseDiagram';

const DiagramType = {
  [ClassDiagramType]: ClassDiagramType,
  [UseCaseDiagramType]: UseCaseDiagramType,
};

export default DiagramType;
