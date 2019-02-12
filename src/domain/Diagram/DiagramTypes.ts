import Diagram from './Diagram';
import Omit from '../utils/Omit';

export const enum DiagramType {
  ClassDiagram = 'CLASS',
  ActivityDiagram = 'ACTIVITY',
}

export const enum ActionTypes {}

export interface DiagramState extends Omit<Diagram, 'render' | 'addElement' | 'removeElement' | 'resizeElement'> {}
