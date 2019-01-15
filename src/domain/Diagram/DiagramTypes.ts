import Diagram from './Diagram';

export const enum DiagramType {
  ClassDiagram = 'CLASS',
  ActivityDiagram = 'ACTIVITY',
}

export const enum ActionTypes {}

export interface DiagramState extends Diagram {}
