import { DiagramType, ApollonMode, EditorMode, InteractiveElementsMode } from './types';
import { Reducer } from 'react';

export const initialOptions = {
  diagramType: DiagramType.ClassDiagram,
  mode: ApollonMode.Full,
  editorMode: EditorMode.ModelingView,
  interactiveMode: InteractiveElementsMode.Highlighted,
  debug: false,
};

export type OptionsState = {
  diagramType: DiagramType;
  mode: ApollonMode;
  editorMode: EditorMode;
  interactiveMode: InteractiveElementsMode;
  debug: boolean;
};
